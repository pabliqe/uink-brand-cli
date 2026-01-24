import './style.css'
import { generateOgImage, loadBrandExample } from './api'

const app = document.getElementById('app')

app.innerHTML = `
  <div class="container">
    <header>
      <h1>🎨 OG Image Generator</h1>
      <p class="subtitle">Test your brand.json configuration and preview the generated OG image</p>
    </header>

    <div class="content">
      <!-- Editor Panel -->
      <div class="panel">
        <h2>Brand Configuration</h2>

        <div class="form-group">
          <label for="brandName">Brand Name</label>
          <input type="text" id="brandName" placeholder="e.g., My Brand">
        </div>

        <div class="form-group">
          <label for="siteTitle">Site Title / Tagline</label>
          <input type="text" id="siteTitle" placeholder="e.g., Building the future">
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <input type="text" id="description" placeholder="e.g., We create amazing digital experiences">
        </div>

        <div class="form-group">
          <label for="siteUrl">Site URL</label>
          <input type="text" id="siteUrl" placeholder="e.g., https://yourdomain.com">
        </div>

        <div class="color-section">
          <h3>Colors</h3>
          
          <div class="form-group">
            <label for="colorPrimary">Primary Color</label>
            <div class="color-input-wrapper">
              <input type="color" id="colorPrimary">
              <input type="text" class="color-value" id="colorPrimaryText" readonly>
            </div>
          </div>

          <div class="form-group">
            <label for="colorAccent">Accent Color</label>
            <div class="color-input-wrapper">
              <input type="color" id="colorAccent">
              <input type="text" class="color-value" id="colorAccentText" readonly>
            </div>
          </div>

          <div class="form-group">
            <label for="colorBg">Background Color</label>
            <div class="color-input-wrapper">
              <input type="color" id="colorBg">
              <input type="text" class="color-value" id="colorBgText" readonly>
            </div>
          </div>

          <div class="form-group">
            <label for="colorText">Text Color</label>
            <div class="color-input-wrapper">
              <input type="color" id="colorText">
              <input type="text" class="color-value" id="colorTextText" readonly>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button class="btn-primary" id="generateBtn">Generate OG Image</button>
          <button class="btn-secondary" id="loadExampleBtn">Load Example</button>
        </div>

        <div id="status" class="status"></div>
        <div class="loading" id="loading"><div class="spinner"></div> Generating...</div>

        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          <label>JSON Export (for brand.json)</label>
          <textarea id="jsonExport" readonly onclick="this.select()"></textarea>
          <button class="btn-secondary" id="copyJsonBtn" style="width: 100%; margin-top: 10px;">Copy JSON</button>
        </div>
      </div>

      <!-- Preview Panel -->
      <div class="panel">
        <h2>OG Image Preview</h2>
        <div class="preview empty" id="preview">
          <div>
            <p style="font-size: 18px; margin-bottom: 10px;">👆 Configure your brand and click "Generate OG Image"</p>
            <p style="font-size: 12px; color: #bbb;">Preview will appear here (1200x630px)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
`

// Get DOM elements
const inputs = {
  brandName: document.getElementById('brandName'),
  siteTitle: document.getElementById('siteTitle'),
  description: document.getElementById('description'),
  siteUrl: document.getElementById('siteUrl'),
  colorPrimary: document.getElementById('colorPrimary'),
  colorAccent: document.getElementById('colorAccent'),
  colorBg: document.getElementById('colorBg'),
  colorText: document.getElementById('colorText'),
}

const buttons = {
  generate: document.getElementById('generateBtn'),
  loadExample: document.getElementById('loadExampleBtn'),
  copyJson: document.getElementById('copyJsonBtn'),
}

const elements = {
  status: document.getElementById('status'),
  loading: document.getElementById('loading'),
  preview: document.getElementById('preview'),
  jsonExport: document.getElementById('jsonExport'),
}

// Sync color inputs with text display
;['colorPrimary', 'colorAccent', 'colorBg', 'colorText'].forEach(key => {
  inputs[key].addEventListener('change', (e) => {
    document.getElementById(key + 'Text').value = e.target.value.toUpperCase()
    updateJson()
  })
  inputs[key].addEventListener('input', (e) => {
    document.getElementById(key + 'Text').value = e.target.value.toUpperCase()
  })
})

// Update JSON on input change
Object.values(inputs).forEach(input => {
  input.addEventListener('change', updateJson)
})

function getBrandConfig() {
  return {
    brand: {
      name: inputs.brandName.value || 'Your Brand',
      siteTitle: inputs.siteTitle.value || 'Your Site Title',
      description: inputs.description.value || 'Your description',
      siteUrl: inputs.siteUrl.value || ''
    },
    colors: {
      primary: { DEFAULT: inputs.colorPrimary.value },
      secondary: { blue: { DEFAULT: inputs.colorAccent.value } },
      ui: {
        background: inputs.colorBg.value,
        text: { primary: inputs.colorText.value, accent: inputs.colorAccent.value }
      }
    }
  }
}

function updateJson() {
  elements.jsonExport.value = JSON.stringify(getBrandConfig(), null, 2)
}

async function handleGenerateImage() {
  const btn = buttons.generate
  const statusEl = elements.status
  const loadingEl = elements.loading
  const previewEl = elements.preview

  try {
    btn.disabled = true
    loadingEl.classList.add('active')
    statusEl.textContent = ''
    statusEl.className = 'status'

    const result = await generateOgImage(getBrandConfig())
    
    previewEl.innerHTML = `<img src="${result.image}" alt="OG Image" style="width: 100%;">`
    
    statusEl.textContent = '✓ OG Image generated successfully!'
    statusEl.className = 'status success'

  } catch (error) {
    statusEl.textContent = `✗ Error: ${error.message}`
    statusEl.className = 'status error'
    previewEl.innerHTML = `<div><p style="font-size: 16px; color: #d32f2f;">⚠️ ${error.message}</p></div>`
  } finally {
    btn.disabled = false
    loadingEl.classList.remove('active')
  }
}

async function handleLoadExample() {
  try {
    const brand = await loadBrandExample()
    
    inputs.brandName.value = brand.brand.name
    inputs.siteTitle.value = brand.brand.siteTitle
    inputs.description.value = brand.brand.description
    inputs.siteUrl.value = brand.brand.siteUrl
    inputs.colorPrimary.value = brand.colors.primary.DEFAULT
    inputs.colorAccent.value = brand.colors.secondary.blue.DEFAULT
    inputs.colorBg.value = brand.colors.ui.background
    inputs.colorText.value = brand.colors.ui.text.primary

    // Update text displays
    document.getElementById('colorPrimaryText').value = inputs.colorPrimary.value.toUpperCase()
    document.getElementById('colorAccentText').value = inputs.colorAccent.value.toUpperCase()
    document.getElementById('colorBgText').value = inputs.colorBg.value.toUpperCase()
    document.getElementById('colorTextText').value = inputs.colorText.value.toUpperCase()

    updateJson()
    elements.status.textContent = '✓ Example loaded'
    elements.status.className = 'status success'
  } catch (error) {
    elements.status.textContent = `✗ Error loading example: ${error.message}`
    elements.status.className = 'status error'
  }
}

function handleCopyJson() {
  const json = elements.jsonExport
  json.select()
  document.execCommand('copy')
  
  const btn = buttons.copyJson
  const original = btn.textContent
  btn.textContent = 'Copied!'
  setTimeout(() => { btn.textContent = original }, 2000)
}

// Event listeners
buttons.generate.addEventListener('click', handleGenerateImage)
buttons.loadExample.addEventListener('click', handleLoadExample)
buttons.copyJson.addEventListener('click', handleCopyJson)

// Initialize
updateJson()
