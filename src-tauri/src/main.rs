// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod python;
mod state;

use state::AppState;
use tauri::Manager;

fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            // Process management
            commands::process::start_ollama,
            commands::process::start_comfyui,
            commands::process::stop_comfyui,
            commands::process::comfyui_status,
            commands::process::find_comfyui,
            commands::process::set_comfyui_path,
            // Installation
            commands::install::install_comfyui,
            commands::install::install_comfyui_status,
            // Whisper STT
            commands::whisper::whisper_status,
            commands::whisper::transcribe,
            // Agent tools
            commands::agent::execute_code,
            commands::agent::file_read,
            commands::agent::file_write,
            // Downloads
            commands::download::download_model,
            commands::download::download_progress,
            commands::download::pause_download,
            commands::download::cancel_download,
            commands::download::resume_download,
            // Web search
            commands::search::web_search,
            commands::search::search_status,
            commands::search::install_searxng,
            commands::search::searxng_status,
            // Proxy
            commands::proxy::ollama_search,
            commands::proxy::fetch_external,
            commands::proxy::fetch_external_bytes,
            commands::proxy::proxy_localhost,
            commands::proxy::proxy_localhost_stream,
            // Window management
            commands::process::show_window,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            if let Some(window) = app.get_webview_window("main") {
                window.open_devtools();
            }

            let state = app.state::<AppState>();

            // Auto-start Ollama
            commands::process::auto_start_ollama(&state);

            // Auto-start ComfyUI
            commands::process::auto_start_comfyui(&state);

            // Start Whisper server in background thread (model loading can take minutes)
            let handle = app.handle().clone();
            let python_bin = state.python_bin.clone();
            let whisper = state.whisper.clone();
            std::thread::spawn(move || {
                commands::whisper::auto_start_whisper_sync(&handle, &python_bin, &whisper);
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
