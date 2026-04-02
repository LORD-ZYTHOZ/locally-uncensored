use std::sync::atomic::Ordering;
use tauri::State;

use crate::state::AppState;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
}

async fn try_searxng(query: &str, count: usize) -> Result<Vec<SearchResult>, String> {
    let url = format!(
        "http://localhost:8888/search?q={}&format=json&engines=google,duckduckgo,brave&categories=general",
        urlencoding::encode(query)
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("SearXNG: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let results = json.get("results")
        .and_then(|r| r.as_array())
        .map(|arr| {
            arr.iter()
                .take(count)
                .filter_map(|r| {
                    Some(SearchResult {
                        title: r.get("title")?.as_str()?.to_string(),
                        url: r.get("url")?.as_str()?.to_string(),
                        snippet: r.get("content").and_then(|c| c.as_str()).unwrap_or("").to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(results)
}

async fn try_ddg(query: &str, count: usize) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.post("https://html.duckduckgo.com/html/")
        .form(&[("q", query)])
        .send()
        .await
        .map_err(|e| format!("DDG: {}", e))?;

    let html = resp.text().await.map_err(|e| e.to_string())?;

    // Parse results — capture full inner HTML then strip tags
    let title_re = regex::Regex::new(r#"class="result__a"[^>]*>(.*?)</a>"#).unwrap();
    let url_re = regex::Regex::new(r#"class="result__url"[^>]*?href="([^"]*)"#).unwrap();
    let snippet_re = regex::Regex::new(r#"class="result__snippet"[^>]*>([\s\S]*?)</(?:td|div|a\s)"#).unwrap();

    let titles: Vec<String> = title_re.captures_iter(&html)
        .map(|c| html_decode(&strip_html(&c[1])))
        .collect();
    let urls: Vec<String> = url_re.captures_iter(&html)
        .map(|c| {
            let raw = &c[1];
            // DDG wraps URLs — extract actual URL from redirect
            if let Some(pos) = raw.find("uddg=") {
                let after = &raw[pos + 5..];
                urlencoding::decode(after.split('&').next().unwrap_or(after))
                    .unwrap_or_else(|_| after.into())
                    .to_string()
            } else {
                raw.to_string()
            }
        })
        .collect();
    let snippets: Vec<String> = snippet_re.captures_iter(&html)
        .map(|c| html_decode(&strip_html(&c[1])).trim().to_string())
        .collect();

    let mut results = Vec::new();
    for i in 0..titles.len().min(count) {
        let url = urls.get(i).cloned().unwrap_or_default();
        let snippet = snippets.get(i).cloned().unwrap_or_default();
        if !url.is_empty() {
            results.push(SearchResult {
                title: titles[i].clone(),
                url,
                snippet,
            });
        }
    }

    if results.is_empty() {
        Err("No DDG results".to_string())
    } else {
        Ok(results)
    }
}

async fn try_wikipedia(query: &str, count: usize) -> Result<Vec<SearchResult>, String> {
    let url = format!(
        "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={}&format=json&srlimit={}",
        urlencoding::encode(query), count
    );

    let resp = reqwest::get(&url)
        .await
        .map_err(|e| format!("Wikipedia: {}", e))?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let results: Vec<SearchResult> = json.pointer("/query/search")
        .and_then(|s| s.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|r| {
                    let title = r.get("title")?.as_str()?;
                    Some(SearchResult {
                        title: title.to_string(),
                        url: format!("https://en.wikipedia.org/wiki/{}", urlencoding::encode(title)),
                        snippet: r.get("snippet").and_then(|s| s.as_str())
                            .map(|s| html_decode(&strip_html(s)))
                            .unwrap_or_default(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    if results.is_empty() {
        Err("No Wikipedia results".to_string())
    } else {
        Ok(results)
    }
}

fn html_decode(s: &str) -> String {
    s.replace("&amp;", "&")
     .replace("&lt;", "<")
     .replace("&gt;", ">")
     .replace("&quot;", "\"")
     .replace("&#39;", "'")
     .replace("&#x27;", "'")
}

fn strip_html(s: &str) -> String {
    let re = regex::Regex::new(r"<[^>]+>").unwrap();
    re.replace_all(s, "").to_string()
}

#[tauri::command]
pub async fn web_search(
    query: String,
    count: Option<usize>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let count = count.unwrap_or(5);

    // Try SearXNG first
    if state.searxng_available.load(Ordering::Relaxed) {
        if let Ok(results) = try_searxng(&query, count).await {
            return Ok(serde_json::json!({"results": results}));
        }
    }

    // Fallback to DuckDuckGo
    if let Ok(results) = try_ddg(&query, count).await {
        return Ok(serde_json::json!({"results": results}));
    }

    // Fallback to Wikipedia
    if let Ok(results) = try_wikipedia(&query, count).await {
        return Ok(serde_json::json!({"results": results}));
    }

    Ok(serde_json::json!({"results": [], "error": "All search tiers failed"}))
}

#[tauri::command]
pub async fn search_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let available = client.get("http://localhost:8888")
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    state.searxng_available.store(available, Ordering::Relaxed);

    Ok(serde_json::json!({"searxng": available}))
}

#[tauri::command]
pub fn install_searxng(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mut install = state.searxng_install.lock().unwrap();
    if install.status == "installing" {
        return Ok(serde_json::json!({"status": "already_installing"}));
    }

    install.status = "installing".to_string();
    install.logs.clear();
    install.logs.push("Pulling SearXNG Docker image...".to_string());
    drop(install);

    // Run docker pull + run in background
    std::thread::spawn(move || {
        let pull = std::process::Command::new("docker")
            .args(["pull", "searxng/searxng"])
            .output();

        match pull {
            Ok(output) if output.status.success() => {
                let _ = std::process::Command::new("docker")
                    .args([
                        "run", "-d", "--name", "searxng",
                        "-p", "8888:8080",
                        "-e", "INSTANCE_NAME=locally-uncensored",
                        "searxng/searxng",
                    ])
                    .output();
                println!("[SearXNG] Installed and running on port 8888");
            }
            _ => {
                println!("[SearXNG] Docker pull failed. Is Docker installed?");
            }
        }
    });

    Ok(serde_json::json!({"status": "installing"}))
}

#[tauri::command]
pub fn searxng_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let install = state.searxng_install.lock().unwrap();
    Ok(serde_json::json!({
        "status": install.status,
        "logs": install.logs,
    }))
}
