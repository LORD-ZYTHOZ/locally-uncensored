use std::process::Command;

/// Resolve the real Python binary path, filtering out Windows Store alias.
pub fn get_python_bin() -> String {
    if cfg!(not(target_os = "windows")) {
        return "python3".to_string();
    }

    if let Ok(output) = Command::new("where")
        .arg("python")
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let path = line.trim();
                if !path.is_empty() && !path.contains("WindowsApps") {
                    return path.to_string();
                }
            }
        }
    }

    "python".to_string()
}
