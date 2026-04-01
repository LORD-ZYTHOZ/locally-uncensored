/// Proxy search requests to ollama.com (needed because frontend can't CORS to ollama.com)
#[tauri::command]
pub async fn ollama_search(query: String) -> Result<serde_json::Value, String> {
    let url = format!(
        "https://ollama.com/search?q={}&p=1",
        urlencoding::encode(&query)
    );

    let client = reqwest::Client::builder()
        .user_agent("LocallyUncensored/1.3")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client.get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| format!("Ollama search: {}", e))?;

    let text = resp.text().await.map_err(|e| e.to_string())?;

    // Try to parse as JSON; if it's HTML, return empty results
    match serde_json::from_str::<serde_json::Value>(&text) {
        Ok(json) => Ok(json),
        Err(_) => Ok(serde_json::json!({"models": []})),
    }
}
