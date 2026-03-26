export interface DiscoverModel {
  name: string
  description: string
  pulls: string
  tags: string[]
  updated: string
  url?: string
  // For direct download
  downloadUrl?: string
  filename?: string
  subfolder?: string  // ComfyUI models subfolder: checkpoints, diffusion_models, vae, text_encoders
  sizeGB?: number
}

export interface DownloadProgress {
  progress: number
  total: number
  speed: number
  filename: string
  status: 'connecting' | 'downloading' | 'complete' | 'error'
  error?: string
}

// ─── Download API ───

export async function startModelDownload(url: string, subfolder: string, filename: string): Promise<{ status: string; id: string; error?: string }> {
  const res = await fetch('/local-api/download-model', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, subfolder, filename }),
  })
  return res.json()
}

export async function getDownloadProgress(): Promise<Record<string, DownloadProgress>> {
  try {
    const res = await fetch('/local-api/download-progress')
    return res.json()
  } catch {
    return {}
  }
}

// ─── Ollama Text Models ───

export async function fetchAbliteratedModels(): Promise<DiscoverModel[]> {
  try {
    const res = await fetch('/ollama-search?q=abliterated&p=1')
    const html = await res.text()

    const models: DiscoverModel[] = []
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const items = doc.querySelectorAll('[x-test-search-response-title]')
    items.forEach((item) => {
      const container = item.closest('a') || item.parentElement?.closest('a')
      const name = item.textContent?.trim() || ''
      const href = container?.getAttribute('href') || ''

      const parent = item.closest('div')?.parentElement
      const spans = parent?.querySelectorAll('span') || []
      let pulls = ''
      let updated = ''

      spans.forEach((span) => {
        const text = span.textContent?.trim() || ''
        if (text.includes('Pull') || text.includes('K') || text.includes('M')) {
          if (!pulls) pulls = text
        }
        if (text.includes('ago') || text.includes('month') || text.includes('week') || text.includes('day')) {
          updated = text
        }
      })

      if (name && href) {
        models.push({
          name: href.startsWith('/') ? href.slice(1) : name,
          description: '',
          pulls,
          tags: [],
          updated,
        })
      }
    })

    if (models.length === 0) return getCuratedTextModels()
    return models
  } catch {
    return getCuratedTextModels()
  }
}

function getCuratedTextModels(): DiscoverModel[] {
  return [
    { name: 'mannix/llama3.1-8b-abliterated', description: 'Llama 3.1 8B with safety filters removed', pulls: '200K+', tags: ['8B', 'Q5_K_M'], updated: 'Popular' },
    { name: 'huihui_ai/qwen2.5-abliterated', description: 'Qwen 2.5 abliterated series', pulls: '50K+', tags: ['7B', '14B', '32B'], updated: 'Popular' },
    { name: 'richardyoung/qwen3-14b-abliterated', description: 'Qwen3 14B with 80% reduced refusals', pulls: '4K+', tags: ['14B', 'Q4_K_M'], updated: 'Recent' },
    { name: 'huihui_ai/qwen3-abliterated', description: 'Qwen3 abliterated series', pulls: '30K+', tags: ['8B', '30B'], updated: 'Popular' },
    { name: 'huihui_ai/gemma3-abliterated', description: 'Google Gemma 3 abliterated', pulls: '20K+', tags: ['4B', '12B', '27B'], updated: 'Recent' },
    { name: 'huihui_ai/llama3.3-abliterated', description: 'Llama 3.3 70B abliterated', pulls: '15K+', tags: ['70B'], updated: 'Popular' },
    { name: 'huihui_ai/deepseek-r1-abliterated', description: 'DeepSeek R1 abliterated reasoning', pulls: '40K+', tags: ['8B', '14B', '32B', '70B'], updated: 'Recent' },
    { name: 'huihui_ai/mistral-small-abliterated', description: 'Mistral Small 24B abliterated', pulls: '10K+', tags: ['24B'], updated: 'Recent' },
    { name: 'krith/mistral-nemo-instruct-2407-abliterated', description: 'Mistral Nemo 12B abliterated', pulls: '5K+', tags: ['12B'], updated: 'Popular' },
    { name: 'huihui_ai/phi4-abliterated', description: 'Microsoft Phi-4 abliterated', pulls: '8K+', tags: ['14B'], updated: 'Recent' },
  ]
}

// ─── Image Models (with direct HuggingFace download URLs) ───

export function getImageModelsDiscover(): DiscoverModel[] {
  return [
    {
      name: 'Juggernaut XL V9',
      description: 'Best photorealistic SDXL checkpoint.',
      pulls: 'Top Rated', tags: ['SDXL', '6.5 GB', 'Photorealistic'], updated: 'civitai.com',
      url: 'https://civitai.com/models/133005/juggernaut-xl',
      downloadUrl: 'https://huggingface.co/RunDiffusion/Juggernaut-XL-v9/resolve/main/Juggernaut-XL_v9_RunDiffusion.safetensors',
      filename: 'Juggernaut-XL_v9.safetensors', subfolder: 'checkpoints', sizeGB: 6.5,
    },
    {
      name: 'RealVisXL V5',
      description: 'Photorealistic SDXL. Great for portraits and landscapes.',
      pulls: 'Popular', tags: ['SDXL', '6.5 GB', 'Photorealistic'], updated: 'civitai.com',
      url: 'https://civitai.com/models/139562/realvisxl',
      downloadUrl: 'https://huggingface.co/SG161222/RealVisXL_V5.0/resolve/main/RealVisXL_V5.0.safetensors',
      filename: 'RealVisXL_V5.safetensors', subfolder: 'checkpoints', sizeGB: 6.5,
    },
    {
      name: 'Pony Diffusion V6 XL',
      description: 'Anime/stylized art. Huge LoRA ecosystem.',
      pulls: 'Top Rated', tags: ['SDXL', '6.5 GB', 'Anime'], updated: 'civitai.com',
      url: 'https://civitai.com/models/257749/pony-diffusion-v6-xl',
    },
    {
      name: 'FLUX.1 [schnell] (FP8)',
      description: 'Fast FLUX. 1-4 step generation. Place in diffusion_models.',
      pulls: 'State-of-art', tags: ['FLUX', '~12 GB', 'Fast'], updated: 'huggingface.co',
      url: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell',
      downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/flux1-schnell.safetensors',
      filename: 'flux1-schnell.safetensors', subfolder: 'diffusion_models', sizeGB: 11.5,
    },
    {
      name: 'FLUX.1 [dev] (FP8)',
      description: 'High quality FLUX. Needs FP8 for 12GB VRAM.',
      pulls: 'State-of-art', tags: ['FLUX', '~12 GB', 'Quality'], updated: 'huggingface.co',
      url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev',
      downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors',
      filename: 'flux1-dev.safetensors', subfolder: 'diffusion_models', sizeGB: 11.5,
    },
    {
      name: 'FLUX VAE',
      description: 'Required VAE for FLUX models.',
      pulls: 'Required', tags: ['VAE', '335 MB'], updated: 'huggingface.co',
      downloadUrl: 'https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors',
      filename: 'flux-ae.safetensors', subfolder: 'vae', sizeGB: 0.3,
    },
  ]
}

// ─── Video Models (with direct download URLs) ───

export function getVideoModelsDiscover(): DiscoverModel[] {
  return [
    {
      name: 'Wan 2.1 T2V 1.3B',
      description: 'Lightweight text-to-video. Best for 8-10 GB VRAM.',
      pulls: '8-10 GB VRAM', tags: ['Wan', '1.3B', '480p'], updated: 'huggingface.co',
      url: 'https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B-diffusers',
      downloadUrl: 'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_1.3B_bf16.safetensors',
      filename: 'wan2.1_t2v_1.3B_bf16.safetensors', subfolder: 'diffusion_models', sizeGB: 2.5,
    },
    {
      name: 'Wan 2.1 T2V 14B (FP8)',
      description: 'High quality text-to-video. FP8 quantized for 12GB GPUs.',
      pulls: '10-12 GB VRAM', tags: ['Wan', '14B', '720p'], updated: 'huggingface.co',
      url: 'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged',
      downloadUrl: 'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/diffusion_models/wan2.1_t2v_14B_fp8_e4m3fn.safetensors',
      filename: 'wan2.1_t2v_14B_fp8.safetensors', subfolder: 'diffusion_models', sizeGB: 14.0,
    },
    {
      name: 'Wan 2.1 VAE',
      description: 'Required VAE for Wan models.',
      pulls: 'Required', tags: ['VAE', '200 MB'], updated: 'huggingface.co',
      downloadUrl: 'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/vae/wan_2.1_vae.safetensors',
      filename: 'wan_2.1_vae.safetensors', subfolder: 'vae', sizeGB: 0.2,
    },
    {
      name: 'Wan 2.1 CLIP (UMT5-XXL)',
      description: 'Required text encoder for Wan models.',
      pulls: 'Required', tags: ['CLIP', '~10 GB'], updated: 'huggingface.co',
      downloadUrl: 'https://huggingface.co/Comfy-Org/Wan_2.1_ComfyUI_repackaged/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors',
      filename: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', subfolder: 'text_encoders', sizeGB: 4.9,
    },
    {
      name: 'Hunyuan Video',
      description: 'Tencent video generation. Compatible with Wan workflow.',
      pulls: '12+ GB VRAM', tags: ['Hunyuan', '13B', '720p'], updated: 'huggingface.co',
      url: 'https://huggingface.co/tencent/HunyuanVideo',
    },
    {
      name: 'AnimateDiff v3',
      description: 'Motion model for SD 1.5 checkpoints. Install via ComfyUI Manager.',
      pulls: '6-8 GB VRAM', tags: ['AnimateDiff', 'SD1.5', 'MP4'], updated: 'github.com',
      url: 'https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved',
    },
  ]
}
