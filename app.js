import { addMinutesTarget, formatClockTime, formatRemaining, nextTargetAt } from './timer-utils.js'

const STORAGE_KEY = 'just-a-timer-settings-v1'
const THEMES = ['black', 'white', 'colorful']
const THEME_COLORS = {
  black: '#050505',
  white: '#f6f3eb',
  colorful: '#5f2ae3',
}

const elements = {
  body: document.body,
  timer: document.querySelector('#timer'),
  digits: document.querySelector('#digits'),
  done: document.querySelector('#done'),
  label: document.querySelector('#label-input'),
  timeToggle: document.querySelector('#target-time'),
  timeValue: document.querySelector('#target-time-value'),
  timeField: document.querySelector('#time-field'),
  timePopover: document.querySelector('#time-popover'),
  targetHour: document.querySelector('#target-hour'),
  targetMinute: document.querySelector('#target-minute'),
  setExactTime: document.querySelector('#set-exact-time'),
  clearTime: document.querySelector('#clear-time'),
  quickTimes: [...document.querySelectorAll('[data-minutes]')],
  doneInput: document.querySelector('#done-input'),
  logo: document.querySelector('#brand-logo'),
  logoButton: document.querySelector('#logo-button'),
  logoFile: document.querySelector('#logo-file'),
  uploadLogo: document.querySelector('#upload-logo'),
  removeLogo: document.querySelector('#remove-logo'),
  fullscreen: document.querySelector('#fullscreen'),
  fullscreenLabel: document.querySelector('#fullscreen-label'),
  status: document.querySelector('#status'),
  themeColor: document.querySelector('#theme-color'),
  themeButtons: [...document.querySelectorAll('[data-theme-choice]')],
}
let wakeLock = null
let statusTimeout = null
let uiTimeout = null
let targetTimestamp = null
let logoMode = 'none'
let logoData = ''
let timePopoverOpen = false

function defaultTarget() {
  return addMinutesTarget(60)
}

function loadSettings() {
  const defaults = {
    label: 'Time left',
    targetTimestamp: defaultTarget(),
    doneText: 'Done!',
    theme: 'colorful',
    logoMode: 'none',
    logoData: '',
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      label: typeof saved.label === 'string' ? saved.label : defaults.label,
      targetTimestamp: Number.isFinite(saved.targetTimestamp) ? saved.targetTimestamp : defaults.targetTimestamp,
      doneText: typeof saved.doneText === 'string' ? saved.doneText : defaults.doneText,
      theme: THEMES.includes(saved.theme) ? saved.theme : defaults.theme,
      logoMode: ['custom', 'none'].includes(saved.logoMode) ? saved.logoMode : defaults.logoMode,
      logoData: typeof saved.logoData === 'string' ? saved.logoData : defaults.logoData,
    }
  } catch {
    return defaults
  }
}

const settings = loadSettings()
targetTimestamp = settings.targetTimestamp
logoMode = settings.logoMode
logoData = settings.logoData

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      label: elements.label.value,
      targetTimestamp,
      doneText: elements.doneInput.value,
      theme: elements.timer.dataset.theme,
      logoMode,
      logoData,
    }))
    return true
  } catch {
    return false
  }
}

function setLabelWidth() {
  const length = elements.label.value.length || elements.label.placeholder.length
  elements.timer.style.setProperty('--label-width', `${Math.min(Math.max(length + 1, 5), 46)}ch`)
}

function setDoneText() {
  elements.done.textContent = elements.doneInput.value
  elements.done.classList.toggle('is-long', elements.doneInput.value.length > 12)
}

function updateTimeDisplay() {
  const value = formatClockTime(targetTimestamp)
  elements.timeValue.textContent = value
  elements.timeField.classList.toggle('is-empty', !value)
}

function populateExactTime() {
  const source = Number.isFinite(targetTimestamp)
    ? new Date(targetTimestamp)
    : new Date(Date.now() + 15 * 60 * 1000)
  elements.targetHour.value = String(source.getHours()).padStart(2, '0')
  elements.targetMinute.value = String(source.getMinutes()).padStart(2, '0')
}

function updateTimer() {
  if (!Number.isFinite(targetTimestamp)) {
    elements.digits.hidden = true
    elements.done.hidden = true
    elements.timer.classList.remove('has-hours')
    document.title = elements.label.value || 'Timer'
    return
  }

  const remaining = targetTimestamp - Date.now()

  if (remaining <= 0) {
    elements.digits.hidden = true
    elements.done.hidden = false
    setDoneText()
    document.title = elements.doneInput.value ? `${elements.doneInput.value} · Timer` : 'Timer'
    return
  }

  const value = formatRemaining(remaining)
  elements.digits.hidden = false
  elements.done.hidden = true
  elements.digits.textContent = value
  elements.timer.classList.toggle('has-hours', value.length > 5)
  document.title = `${value} · ${elements.label.value || 'Timer'}`
}

function selectTheme(theme) {
  if (!THEMES.includes(theme)) return
  elements.timer.dataset.theme = theme
  elements.themeColor.content = THEME_COLORS[theme]
  elements.themeButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme))
  })
  saveSettings()
}

function renderLogo() {
  const hasLogo = logoMode === 'custom' && Boolean(logoData)
  elements.logoButton.classList.toggle('has-no-logo', !hasLogo)
  elements.logo.hidden = !hasLogo
  elements.removeLogo.disabled = !hasLogo

  if (!hasLogo) return
  elements.logo.src = logoData
}

function showStatus(message) {
  elements.status.textContent = message
  elements.status.classList.add('is-visible')
  clearTimeout(statusTimeout)
  statusTimeout = setTimeout(() => elements.status.classList.remove('is-visible'), 2400)
}

function activeTextField() {
  const active = document.activeElement
  return active === elements.label
    || active === elements.targetHour
    || active === elements.targetMinute
    || active === elements.doneInput
}

function hideUi() {
  if (activeTextField() || timePopoverOpen) return
  elements.body.classList.remove('ui-visible')
}

function revealUi() {
  elements.body.classList.add('ui-visible')
  clearTimeout(uiTimeout)
  if (!activeTextField() && !timePopoverOpen) uiTimeout = setTimeout(hideUi, 2800)
}

function focusDoneEditor() {
  revealUi()
  elements.doneInput.focus()
  elements.doneInput.select()
}

function setTarget(timestamp) {
  targetTimestamp = timestamp
  updateTimeDisplay()
  saveSettings()
  updateTimer()
}

function openTimePopover() {
  timePopoverOpen = true
  populateExactTime()
  elements.timeField.classList.add('is-open')
  elements.timeToggle.setAttribute('aria-expanded', 'true')
  elements.timePopover.setAttribute('aria-hidden', 'false')
  elements.timePopover.removeAttribute('inert')
  revealUi()
}

function closeTimePopover() {
  timePopoverOpen = false
  elements.timeField.classList.remove('is-open')
  elements.timeToggle.setAttribute('aria-expanded', 'false')
  elements.timePopover.setAttribute('aria-hidden', 'true')
  elements.timePopover.setAttribute('inert', '')
  elements.timeToggle.blur()
  revealUi()
}

function setExactTarget() {
  const hours = Number(elements.targetHour.value)
  const minutes = Number(elements.targetMinute.value)
  if (!elements.targetHour.value
    || !elements.targetMinute.value
    || !Number.isInteger(hours)
    || hours < 0
    || hours > 23
    || !Number.isInteger(minutes)
    || minutes < 0
    || minutes > 59) {
    showStatus('Use a time between 00:00 and 23:59')
    return
  }
  setTarget(nextTargetAt(hours, minutes))
  closeTimePopover()
}

async function requestWakeLock(showConfirmation = false) {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible' || wakeLock) return

  try {
    wakeLock = await navigator.wakeLock.request('screen')
    wakeLock.addEventListener('release', () => { wakeLock = null }, { once: true })
    if (showConfirmation) showStatus('Screen will stay awake')
  } catch {
    if (showConfirmation) showStatus('Could not keep the screen awake')
  }
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
    await requestWakeLock(true)
  } catch {
    showStatus('Press F to toggle fullscreen')
  }
}

elements.label.value = settings.label
elements.doneInput.value = settings.doneText
setLabelWidth()
setDoneText()
updateTimeDisplay()
selectTheme(settings.theme)
renderLogo()
updateTimer()

elements.label.addEventListener('input', () => {
  setLabelWidth()
  saveSettings()
  updateTimer()
})

elements.timeToggle.addEventListener('click', () => {
  if (timePopoverOpen) closeTimePopover()
  else openTimePopover()
})

elements.quickTimes.forEach((button) => {
  button.addEventListener('click', () => {
    setTarget(addMinutesTarget(Number(button.dataset.minutes)))
    closeTimePopover()
  })
})

elements.setExactTime.addEventListener('click', setExactTarget)
elements.clearTime.addEventListener('click', () => {
  setTarget(null)
  closeTimePopover()
})

;[elements.targetHour, elements.targetMinute].forEach((input) => {
  input.addEventListener('focus', () => input.select())
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') setExactTarget()
  })
})

elements.doneInput.addEventListener('input', () => {
  setDoneText()
  saveSettings()
  updateTimer()
})

elements.done.addEventListener('click', focusDoneEditor)

elements.themeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectTheme(button.dataset.themeChoice)
    button.blur()
    revealUi()
  })
})

function openLogoPicker() {
  elements.logoFile.value = ''
  elements.logoFile.click()
}

elements.logoButton.addEventListener('click', openLogoPicker)
elements.uploadLogo.addEventListener('click', openLogoPicker)

elements.logoFile.addEventListener('change', () => {
  const [file] = elements.logoFile.files
  if (!file) return
  if (!file.type.startsWith('image/')) {
    showStatus('Choose an image file')
    return
  }

  const reader = new FileReader()
  reader.addEventListener('load', () => {
    logoMode = 'custom'
    logoData = String(reader.result)
    renderLogo()
    if (!saveSettings()) showStatus('Logo is shown, but is too large to save')
    else showStatus('Logo updated')
  })
  reader.readAsDataURL(file)
})

elements.removeLogo.addEventListener('click', () => {
  logoMode = 'none'
  logoData = ''
  elements.logoFile.value = ''
  renderLogo()
  saveSettings()
  showStatus('Logo removed')
  elements.removeLogo.blur()
})

elements.fullscreen.addEventListener('click', toggleFullscreen)

document.addEventListener('keydown', (event) => {
  revealUi()
  if (event.key === 'Escape' && timePopoverOpen) closeTimePopover()
  if (event.key.toLowerCase() === 'f' && !event.target.matches('input')) toggleFullscreen()
})

document.addEventListener('click', (event) => {
  if (timePopoverOpen && !elements.timeField.contains(event.target)) closeTimePopover()
})

document.addEventListener('pointermove', revealUi, { passive: true })
document.addEventListener('pointerdown', () => {
  revealUi()
  requestWakeLock()
}, { passive: true })

document.addEventListener('focusin', revealUi)
document.addEventListener('focusout', () => setTimeout(revealUi, 0))
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock()
})

document.addEventListener('fullscreenchange', () => {
  elements.fullscreenLabel.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'
})

setInterval(updateTimer, 250)
revealUi()
requestWakeLock()
