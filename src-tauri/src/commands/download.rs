use std::fs;
use std::path::PathBuf;
use std::time::Instant;

use futures_util::StreamExt;
use tauri::State;

use crate::state::{AppState, DownloadProgress};

fn models_dir(comfy_path: &Option<String>, subfolder: &str) -> Result<PathBuf, String> {
    let base = comfy_path.as_ref().ok_or("ComfyUI path not set")?;
    let dir = PathBuf::from(base).join("models").join(subfolder);
    fs::create_dir_all(&dir).map_err(|e| format!("Create models dir: {}", e))?;
    Ok(dir)
}

#[tauri::command]
pub async fn download_model(
    url: String,
    subfolder: String,
    filename: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let comfy_path = {
        let p = state.comfy_path.lock().unwrap();
        p.clone()
    };

    let dest_dir = models_dir(&comfy_path, &subfolder)?;
    let dest_file = dest_dir.join(&filename);

    if dest_file.exists() {
        return Ok(serde_json::json!({"status": "exists", "path": dest_file.to_string_lossy()}));
    }

    let id = format!("{}-{}", subfolder, filename);

    // Initialize progress
    {
        let mut downloads = state.downloads.lock().unwrap();
        downloads.insert(id.clone(), DownloadProgress {
            progress: 0,
            total: 0,
            speed: 0.0,
            filename: filename.clone(),
            status: "connecting".to_string(),
            error: None,
        });
    }

    let id_clone = id.clone();
    let filename_clone = filename.clone();

    tokio::spawn(async move {
        match do_download(&url, &dest_file).await {
            Ok(_) => println!("[Download] Complete: {}", filename_clone),
            Err(e) => println!("[Download] Failed: {} - {}", filename_clone, e),
        }
    });

    Ok(serde_json::json!({"status": "started", "id": id}))
}

async fn do_download(url: &str, dest: &PathBuf) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .user_agent("LocallyUncensored/1.3")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| e.to_string())?;

    let response = client.get(url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);

    let tmp_path = dest.with_extension("download");
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .map_err(|e| format!("Create file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;
    let start = Instant::now();

    use tokio::io::AsyncWriteExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        file.write_all(&chunk).await.map_err(|e| format!("Write: {}", e))?;
        downloaded += chunk.len() as u64;

        // Log progress every ~1MB
        if downloaded % (1024 * 1024) < chunk.len() as u64 {
            let elapsed = start.elapsed().as_secs_f64();
            let speed = if elapsed > 0.0 { downloaded as f64 / elapsed } else { 0.0 };
            println!("[Download] {:.1} MB / {:.1} MB ({:.1} MB/s)",
                downloaded as f64 / 1048576.0,
                total as f64 / 1048576.0,
                speed / 1048576.0);
        }
    }

    file.flush().await.map_err(|e| format!("Flush: {}", e))?;
    drop(file);

    tokio::fs::rename(&tmp_path, dest)
        .await
        .map_err(|e| format!("Rename: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn download_progress(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let downloads = state.downloads.lock().unwrap();
    let map: std::collections::HashMap<String, DownloadProgress> = downloads.clone();
    Ok(serde_json::to_value(map).unwrap_or_default())
}
