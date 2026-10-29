/* ============================================================
   STUDENT TIMETABLE  — script.js
   ============================================================ */

'use strict';

// ============================================================
//  DATA LAYER
// ============================================================
const STORAGE_KEY = 'studentTimetable_v2';

/** @returns {Array} */
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let classes = loadData();

// ============================================================
//  HELPERS
// ============================================================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Format "HH:MM" to "HH:MM AM/PM" */
function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour   = h % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function sortClasses(arr) {
  return [...arr].sort((a, b) => {
    const di = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (di !== 0) return di;
    return a.time.localeCompare(b.time);
  });
}

// ============================================================
//  DOM REFS
// ============================================================
const timetableBody  = document.getElementById('timetableBody');
const tableSection   = document.getElementById('tableSection');
const emptyState     = document.getElementById('emptyState');
const noResults      = document.getElementById('noResults');
const totalCount     = document.getElementById('totalCount');
const daysCount      = document.getElementById('daysCount');
const facultyCount   = document.getElementById('facultyCount');

const openModalBtn   = document.getElementById('openModalBtn');
const emptyAddBtn    = document.getElementById('emptyAddBtn');
const modalOverlay   = document.getElementById('modalOverlay');
const modalClose     = document.getElementById('modalClose');
const cancelBtn      = document.getElementById('cancelBtn');
const classForm      = document.getElementById('classForm');
const modalTitle     = document.getElementById('modalTitle');
const submitLabel    = document.getElementById('submitLabel');

const editIdInput    = document.getElementById('editId');
const subjectInput   = document.getElementById('subjectInput');
const facultyInput   = document.getElementById('facultyInput');
const daySelect      = document.getElementById('daySelect');
const timeInput      = document.getElementById('timeInput');
const notesInput     = document.getElementById('notesInput');

const deleteOverlay  = document.getElementById('deleteOverlay');
const deleteClose    = document.getElementById('deleteClose');
const deleteCancelBtn= document.getElementById('deleteCancelBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteSubjectName = document.getElementById('deleteSubjectName');

const dayTabs        = document.getElementById('dayTabs');
const searchInput    = document.getElementById('searchInput');
const clearSearch    = document.getElementById('clearSearch');
const toastContainer = document.getElementById('toastContainer');

// ============================================================
//  STATE
// ============================================================
let activeDay   = 'All';
let searchQuery = '';
let pendingDeleteId = null;

// ============================================================
//  RENDER
// ============================================================
function getFiltered() {
  let data = sortClasses(classes);

  if (activeDay !== 'All') {
    data = data.filter(c => c.day === activeDay);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    data = data.filter(c =>
      c.subject.toLowerCase().includes(q) ||
      c.faculty.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  }

  return data;
}

function updateStats() {
  totalCount.textContent   = classes.length;
  daysCount.textContent    = new Set(classes.map(c => c.day)).size;
  facultyCount.textContent = new Set(classes.map(c => c.faculty.toLowerCase())).size;
}

function renderTable() {
  const filtered = getFiltered();
  updateStats();

  timetableBody.innerHTML = '';

  const hasAny     = classes.length > 0;
  const hasResults = filtered.length > 0;

  // Visibility toggles
  tableSection.style.display = (hasAny && hasResults)  ? '' : 'none';
  emptyState.classList.toggle('show', !hasAny);
  noResults.style.display    = (hasAny && !hasResults) ? 'block' : 'none';

  filtered.forEach(cls => {
    const tr = document.createElement('tr');
    tr.id = `row-${cls.id}`;
    tr.innerHTML = `
      <td class="subject-cell">
        ${escapeHtml(cls.subject)}
        ${cls.notes ? `<div class="subject-note"><i class="fas fa-sticky-note"></i> ${escapeHtml(cls.notes)}</div>` : ''}
      </td>
      <td>
        <span class="day-badge day-${cls.day}">${cls.day}</span>
      </td>
      <td class="time-cell">
        <i class="fas fa-clock" style="color:var(--primary);margin-right:5px;opacity:.7"></i>
        ${formatTime(cls.time)}
      </td>
      <td class="faculty-cell">
        <i class="fas fa-user-tie" style="color:var(--primary);margin-right:5px;opacity:.7"></i>
        ${escapeHtml(cls.faculty)}
      </td>
      <td class="actions-cell">
        <button class="btn-icon btn-edit" title="Edit" onclick="openEditModal('${cls.id}')">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-icon btn-del" title="Delete" onclick="openDeleteModal('${cls.id}')">
          <i class="fas fa-trash-alt"></i>
        </button>
      </td>
    `;
    timetableBody.appendChild(tr);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
//  MODAL — ADD / EDIT
// ============================================================
function openAddModal() {
  classForm.reset();
  editIdInput.value = '';
  clearErrors();

  modalTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Class';
  submitLabel.textContent = 'Save Class';

  modalOverlay.classList.add('open');
  subjectInput.focus();
}

function openEditModal(id) {
  const cls = classes.find(c => c.id === id);
  if (!cls) return;

  clearErrors();
  editIdInput.value    = cls.id;
  subjectInput.value   = cls.subject;
  facultyInput.value   = cls.faculty;
  daySelect.value      = cls.day;
  timeInput.value      = cls.time;
  notesInput.value     = cls.notes || '';

  modalTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Class';
  submitLabel.textContent = 'Update Class';

  modalOverlay.classList.add('open');
  subjectInput.focus();
}

function closeModal() {
  modalOverlay.classList.remove('open');
  classForm.reset();
  clearErrors();
}

// ============================================================
//  MODAL — DELETE
// ============================================================
function openDeleteModal(id) {
  const cls = classes.find(c => c.id === id);
  if (!cls) return;
  pendingDeleteId = id;
  deleteSubjectName.textContent = cls.subject;
  deleteOverlay.classList.add('open');
}

function closeDeleteModal() {
  deleteOverlay.classList.remove('open');
  pendingDeleteId = null;
}

// ============================================================
//  FORM VALIDATION
// ============================================================
function clearErrors() {
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
}

function showError(inputEl, msgEl) {
  inputEl.classList.add('invalid');
  msgEl.classList.add('show');
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!subjectInput.value.trim()) {
    showError(subjectInput, document.getElementById('subjectError'));
    valid = false;
  }
  if (!facultyInput.value.trim()) {
    showError(facultyInput, document.getElementById('facultyError'));
    valid = false;
  }
  if (!daySelect.value) {
    showError(daySelect, document.getElementById('dayError'));
    valid = false;
  }
  if (!timeInput.value) {
    showError(timeInput, document.getElementById('timeError'));
    valid = false;
  }

  return valid;
}

// Clear error on change
[subjectInput, facultyInput, daySelect, timeInput].forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('invalid');
  });
  el.addEventListener('change', () => {
    el.classList.remove('invalid');
  });
});

// ============================================================
//  CRUD
// ============================================================
function addClass(data) {
  const entry = {
    id:      generateId(),
    subject: data.subject.trim(),
    faculty: data.faculty.trim(),
    day:     data.day,
    time:    data.time,
    notes:   data.notes.trim(),
  };
  classes.push(entry);
  saveData(classes);
  renderTable();
  showToast(`"${entry.subject}" added successfully!`, 'success');

  // Highlight new row
  setTimeout(() => {
    const row = document.getElementById(`row-${entry.id}`);
    if (row) row.classList.add('row-highlight');
  }, 100);
}

function editClass(id, data) {
  const idx = classes.findIndex(c => c.id === id);
  if (idx === -1) return;
  classes[idx] = {
    ...classes[idx],
    subject: data.subject.trim(),
    faculty: data.faculty.trim(),
    day:     data.day,
    time:    data.time,
    notes:   data.notes.trim(),
  };
  saveData(classes);
  renderTable();
  showToast(`"${classes[idx].subject}" updated!`, 'success');
}

function deleteClass(id) {
  const cls = classes.find(c => c.id === id);
  classes = classes.filter(c => c.id !== id);
  saveData(classes);
  renderTable();
  if (cls) showToast(`"${cls.subject}" deleted.`, 'warning');
}

// ============================================================
//  FORM SUBMIT
// ============================================================
classForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    subject: subjectInput.value,
    faculty: facultyInput.value,
    day:     daySelect.value,
    time:    timeInput.value,
    notes:   notesInput.value,
  };

  const id = editIdInput.value;
  if (id) {
    editClass(id, data);
  } else {
    addClass(data);
  }

  closeModal();
});

// ============================================================
//  DAY TABS
// ============================================================
dayTabs.addEventListener('click', e => {
  const tab = e.target.closest('.day-tab');
  if (!tab) return;
  document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  activeDay = tab.dataset.day;
  renderTable();
});

// ============================================================
//  SEARCH
// ============================================================
searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  clearSearch.classList.toggle('visible', searchQuery.length > 0);
  renderTable();
});

clearSearch.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearch.classList.remove('visible');
  searchInput.focus();
  renderTable();
});

// ============================================================
//  EVENT LISTENERS
// ============================================================
openModalBtn.addEventListener('click', openAddModal);
emptyAddBtn.addEventListener('click', openAddModal);

modalClose.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);

deleteClose.addEventListener('click', closeDeleteModal);
deleteCancelBtn.addEventListener('click', closeDeleteModal);

confirmDeleteBtn.addEventListener('click', () => {
  if (pendingDeleteId) {
    deleteClass(pendingDeleteId);
    closeDeleteModal();
  }
});

// Close modals when clicking overlay backdrop
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});
deleteOverlay.addEventListener('click', e => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

// Keyboard: Escape closes modals
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (modalOverlay.classList.contains('open'))  closeModal();
    if (deleteOverlay.classList.contains('open')) closeDeleteModal();
  }
});

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'info') {
  const icons = {
    success: 'fa-check-circle',
    error:   'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info:    'fa-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info} toast-icon"></i>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3000);
}

// ============================================================
//  EXPOSE GLOBALS (needed by inline onclick)
// ============================================================
window.openEditModal  = openEditModal;
window.openDeleteModal = openDeleteModal;

// ============================================================
//  INIT
// ============================================================
(function init() {
  // Seed sample data if first launch
  if (classes.length === 0) {
    const samples = [
      { subject: 'Mathematics',       day: 'Monday',    time: '09:00', faculty: 'Dr. A. Sharma',  notes: 'Room 101' },
      { subject: 'Physics',           day: 'Monday',    time: '11:00', faculty: 'Prof. R. Mehta',  notes: 'Lab 3' },
      { subject: 'Computer Science',  day: 'Tuesday',   time: '10:00', faculty: 'Ms. P. Singh',    notes: 'CS Lab' },
      { subject: 'English Literature',day: 'Wednesday', time: '08:30', faculty: 'Dr. K. Verma',    notes: '' },
      { subject: 'Chemistry',         day: 'Thursday',  time: '12:00', faculty: 'Prof. N. Gupta',  notes: 'Chem Lab' },
      { subject: 'Physical Education',day: 'Friday',    time: '07:30', faculty: 'Mr. S. Kumar',    notes: 'Ground' },
      { subject: 'History',           day: 'Saturday',  time: '09:30', faculty: 'Dr. M. Rao',      notes: '' },
    ];
    samples.forEach(s => {
      classes.push({ id: generateId(), ...s });
    });
    saveData(classes);
  }

  renderTable();
})();
