use std::fs;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn install_comfyui(
    install_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    let mut install = state.install_status.lock().unwrap();
    if install.status == "installing" {
        return Ok(serde_json::json!({"status": "already_installing"}));
    }

    install.status = "installing".to_string();
    install.logs.clear();
    install.logs.push("Starting ComfyUI installation...".to_string());
    drop(install);

    let target_dir = install_path
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_default().join("ComfyUI"));

    let python_bin = state.python_bin.clone();

    std::thread::spawn(move || {
        // Step 1: Git clone
        println!("[Install] Cloning ComfyUI to {:?}", target_dir);
        let clone = Command::new("git")
            .args(["clone", "https://github.com/comfyanonymous/ComfyUI.git"])
            .arg(&target_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        match clone {
            Ok(output) if output.status.success() => {
                println!("[Install] Git clone successful");
            }
            Ok(output) => {
                let stderr = String::from_utf8_lossy(&output.stderr);
                // Directory might already exist
                if stderr.contains("already exists") {
                    println!("[Install] ComfyUI directory already exists, updating...");
                    let _ = Command::new("git")
                        .args(["pull"])
                        .current_dir(&target_dir)
                        .output();
                } else {
                    println!("[Install] Git clone failed: {}", stderr);
                    return;
                }
            }
            Err(e) => {
                println!("[Install] Git not available: {}", e);
                return;
            }
        }

        // Step 2: Detect GPU and install PyTorch
        let has_nvidia = Command::new("nvidia-smi")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        println!("[Install] GPU detected: {}", if has_nvidia { "NVIDIA CUDA" } else { "CPU only" });

        let torch_args = if has_nvidia {
            vec!["-m", "pip", "install", "torch", "torchvision", "torchaudio",
                 "--index-url", "https://download.pytorch.org/whl/cu121"]
        } else {
            vec!["-m", "pip", "install", "torch", "torchvision", "torchaudio"]
        };

        println!("[Install] Installing PyTorch...");
        let _ = Command::new(&python_bin)
            .args(&torch_args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output();

        // Step 3: Install ComfyUI requirements
        println!("[Install] Installing ComfyUI requirements...");
        let reqs = target_dir.join("requirements.txt");
        if reqs.exists() {
            let _ = Command::new(&python_bin)
                .args(["-m", "pip", "install", "-r"])
                .arg(&reqs)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output();
        }

        println!("[Install] ComfyUI installation complete");
    });

    Ok(serde_json::json!({"status": "installing"}))
}

#[tauri::command]
pub fn install_comfyui_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let install = state.install_status.lock().unwrap();
    Ok(serde_json::json!({
        "status": install.status,
        "logs": install.logs,
    }))
}
