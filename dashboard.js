(function () {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  applyNavVisibility(session);

  const userInitials = document.getElementById('user-initials');
  const userName = document.getElementById('user-name');
  const greetingName = document.getElementById('greeting-name');
  const logoutBtn = document.getElementById('logout-btn');

  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  const checkinBtn = document.getElementById('checkin-btn');
  const checkoutBtn = document.getElementById('checkout-btn');

  const statCheckin = document.getElementById('stat-checkin');
  const statCheckout = document.getElementById('stat-checkout');
  const statHours = document.getElementById('stat-hours');
  const statMonth = document.getElementById('stat-month');

  const historyBody = document.getElementById('history-body');

  // ---- Capture modal elements ----
  const captureModal = document.getElementById('capture-modal');
  const captureModalTitle = document.getElementById('capture-modal-title');
  const captureModalClose = document.getElementById('capture-modal-close');
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  const capturedPhotoImg = document.getElementById('captured-photo');
  const cameraStatus = document.getElementById('camera-status');
  const captureBtn = document.getElementById('capture-btn');
  const retakeBtn = document.getElementById('retake-btn');
  const metaLocation = document.getElementById('meta-location');
  const metaDevice = document.getElementById('meta-device');
  const metaIp = document.getElementById('meta-ip');
  const retryLocationBtn = document.getElementById('retry-location-btn');
  const captureCancelBtn = document.getElementById('capture-cancel-btn');
  const captureConfirmBtn = document.getElementById('capture-confirm-btn');

  // ---- Detail modal elements ----
  const detailModal = document.getElementById('detail-modal');
  const detailModalClose = document.getElementById('detail-modal-close');
  const detailPhoto = document.getElementById('detail-photo');
  const detailType = document.getElementById('detail-type');
  const detailDatetime = document.getElementById('detail-datetime');
  const detailLocationLink = document.getElementById('detail-location-link');
  const detailLocationText = document.getElementById('detail-location-text');
  const detailDevice = document.getElementById('detail-device');
  const detailIp = document.getElementById('detail-ip');

  // ---- Map modal elements ----
  const mapModal = document.getElementById('map-modal');
  const mapModalClose = document.getElementById('map-modal-close');
  const mapFrameIframe = document.getElementById('map-frame-iframe');
  const mapCoords = document.getElementById('map-coords');

  let currentStream = null;
  let pendingType = null;
  let capturedPhotoDataUrl = null;
  let capturedLocation = null;
  let capturedIp = null;

  userInitials.textContent = getInitials(session.name);
  userName.textContent = session.name;
  greetingName.textContent = session.name;

  logoutBtn.addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });

  function tickClock() {
    const now = new Date();
    clockTime.textContent = formatTime(now);
    clockDate.textContent = formatDateLong(now);
  }
  tickClock();
  setInterval(tickClock, 1000);

  // ---------------- Capture modal flow ----------------

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach((t) => t.stop());
      currentStream = null;
    }
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      cameraStatus.textContent = 'Tu navegador no soporta acceso a la cámara.';
      cameraStatus.hidden = false;
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        currentStream = stream;
        video.srcObject = stream;
        cameraStatus.hidden = true;
      })
      .catch(() => {
        cameraStatus.textContent = 'No se pudo acceder a la cámara. Verifica los permisos del navegador.';
        cameraStatus.hidden = false;
      });
  }

  function updateConfirmState() {
    captureConfirmBtn.disabled = !capturedPhotoDataUrl;
  }

  function resetCaptureModal() {
    capturedPhotoDataUrl = null;
    capturedLocation = null;
    capturedIp = null;

    video.hidden = false;
    capturedPhotoImg.hidden = true;
    capturedPhotoImg.src = '';
    retakeBtn.hidden = true;
    captureBtn.hidden = false;
    cameraStatus.hidden = false;
    cameraStatus.textContent = 'Activando cámara…';

    metaLocation.textContent = 'Obteniendo ubicación…';
    metaDevice.textContent = detectDeviceType();
    metaIp.textContent = 'Obteniendo IP…';

    updateConfirmState();
  }

  function openCaptureModal(type) {
    pendingType = type;
    captureModalTitle.textContent = type === 'entrada' ? 'Registrar entrada' : 'Registrar salida';
    resetCaptureModal();
    captureModal.hidden = false;

    startCamera();
    requestLocation();

    fetchPublicIp().then((ip) => {
      capturedIp = ip;
      metaIp.textContent = ip;
    });
  }

  function requestLocation() {
    metaLocation.textContent = 'Obteniendo ubicación…';
    requestCurrentLocation().then(({ location, error }) => {
      capturedLocation = location;
      metaLocation.textContent = location ? formatLocation(location) : error || 'No disponible';
    });
  }

  function closeCaptureModal() {
    stopCamera();
    captureModal.hidden = true;
  }

  captureBtn.addEventListener('click', () => {
    if (!currentStream || !video.videoWidth) {
      showToast('La cámara aún no está lista', 'error');
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    capturedPhotoDataUrl = canvas.toDataURL('image/jpeg', 0.7);

    capturedPhotoImg.src = capturedPhotoDataUrl;
    capturedPhotoImg.hidden = false;
    video.hidden = true;
    captureBtn.hidden = true;
    retakeBtn.hidden = false;
    stopCamera();
    updateConfirmState();
  });

  retakeBtn.addEventListener('click', () => {
    capturedPhotoDataUrl = null;
    capturedPhotoImg.hidden = true;
    video.hidden = false;
    retakeBtn.hidden = true;
    captureBtn.hidden = false;
    cameraStatus.hidden = false;
    cameraStatus.textContent = 'Activando cámara…';
    startCamera();
    updateConfirmState();
  });

  retryLocationBtn.addEventListener('click', requestLocation);

  captureCancelBtn.addEventListener('click', closeCaptureModal);
  captureModalClose.addEventListener('click', closeCaptureModal);
  captureModal.addEventListener('click', (e) => {
    if (e.target === captureModal) closeCaptureModal();
  });

  captureConfirmBtn.addEventListener('click', () => {
    if (!capturedPhotoDataUrl) return;
    addRecord(session.email, pendingType, {
      photo: capturedPhotoDataUrl,
      location: capturedLocation,
      device: detectDeviceType(),
      ip: capturedIp || 'No disponible',
    });
    closeCaptureModal();
    showToast(
      pendingType === 'entrada' ? 'Entrada registrada correctamente' : 'Salida registrada correctamente',
      'success'
    );
    render();
  });

  checkinBtn.addEventListener('click', () => openCaptureModal('entrada'));
  checkoutBtn.addEventListener('click', () => openCaptureModal('salida'));

  // ---------------- Detail modal ----------------

  function openDetailModal(record) {
    detailType.textContent = record.type === 'entrada' ? 'Entrada' : 'Salida';
    detailDatetime.textContent = `${formatDateShort(new Date(record.timestamp))} · ${formatTimeShort(new Date(record.timestamp))}`;
    detailDevice.textContent = record.device || 'No disponible';
    detailIp.textContent = record.ip || 'No disponible';

    if (record.location) {
      detailLocationLink.hidden = false;
      detailLocationLink.onclick = () => openMapModal(record.location);
      detailLocationText.textContent = '';
    } else {
      detailLocationLink.hidden = true;
      detailLocationText.textContent = 'No disponible';
    }

    if (record.photo) {
      detailPhoto.src = record.photo;
      detailPhoto.hidden = false;
    } else {
      detailPhoto.hidden = true;
    }

    detailModal.hidden = false;
  }

  function closeDetailModal() {
    detailModal.hidden = true;
  }

  detailModalClose.addEventListener('click', closeDetailModal);
  detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) closeDetailModal();
  });

  // ---------------- Map modal ----------------

  function openMapModal(location) {
    const { lat, lng } = location;
    const delta = 0.01;
    const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
    mapFrameIframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
    mapCoords.textContent = formatLocation(location);
    mapModal.hidden = false;
  }

  function closeMapModal() {
    mapModal.hidden = true;
    mapFrameIframe.src = '';
  }

  mapModalClose.addEventListener('click', closeMapModal);
  mapModal.addEventListener('click', (e) => {
    if (e.target === mapModal) closeMapModal();
  });

  historyBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-record-index]');
    if (!btn) return;
    const index = Number(btn.getAttribute('data-record-index'));
    const records = getRecordsForUser(session.email);
    const record = records[index];
    if (record) openDetailModal(record);
  });

  // ---------------- Rendering ----------------

  function todaysRecords() {
    const today = new Date();
    return getRecordsForUser(session.email)
      .filter((r) => isSameDay(new Date(r.timestamp), today))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  function render() {
    const today = todaysRecords();
    const lastCheckin = [...today].reverse().find((r) => r.type === 'entrada');
    const lastCheckout = [...today].reverse().find((r) => r.type === 'salida');

    const isCheckedIn = today.length > 0 && today[today.length - 1].type === 'entrada';

    if (isCheckedIn) {
      statusPill.className = 'status-pill in';
      statusText.textContent = 'Turno activo';
    } else if (today.length > 0) {
      statusPill.className = 'status-pill out';
      statusText.textContent = 'Turno finalizado';
    } else {
      statusPill.className = 'status-pill out';
      statusText.textContent = 'Sin registro hoy';
    }

    checkinBtn.disabled = isCheckedIn;
    checkoutBtn.disabled = !isCheckedIn;

    statCheckin.textContent = lastCheckin ? formatTimeShort(new Date(lastCheckin.timestamp)) : '--:--';
    statCheckout.textContent = lastCheckout ? formatTimeShort(new Date(lastCheckout.timestamp)) : '--:--';

    if (lastCheckin && lastCheckout && new Date(lastCheckout.timestamp) > new Date(lastCheckin.timestamp)) {
      const diffMs = new Date(lastCheckout.timestamp) - new Date(lastCheckin.timestamp);
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      statHours.textContent = `${hours}h ${minutes}m`;
    } else if (lastCheckin && isCheckedIn) {
      const diffMs = new Date() - new Date(lastCheckin.timestamp);
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      statHours.textContent = `${hours}h ${minutes}m`;
    } else {
      statHours.textContent = '0h 0m';
    }

    const now = new Date();
    const monthRecords = getRecordsForUser(session.email).filter((r) => {
      const d = new Date(r.timestamp);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    statMonth.textContent = monthRecords.length;

    const allRecords = getRecordsForUser(session.email);
    const visibleRecords = allRecords.slice(0, 15);
    if (visibleRecords.length === 0) {
      historyBody.innerHTML = '<tr class="empty-row"><td colspan="5">Aún no tienes registros.</td></tr>';
    } else {
      historyBody.innerHTML = visibleRecords
        .map((r, index) => {
          const d = new Date(r.timestamp);
          const badgeClass = r.type === 'entrada' ? 'entrada' : 'salida';
          const label = r.type === 'entrada' ? 'Entrada' : 'Salida';
          const photoCell = r.photo
            ? `<button type="button" class="photo-thumb" data-record-index="${index}"><img src="${r.photo}" alt="Foto de ${label.toLowerCase()}"></button>`
            : `<span class="photo-thumb photo-thumb-empty">--</span>`;
          return `<tr>
            <td>${formatDateShort(d)}</td>
            <td><span class="badge ${badgeClass}">${label}</span></td>
            <td>${formatTimeShort(d)}</td>
            <td>${photoCell}</td>
            <td><button type="button" class="link-btn" data-record-index="${index}">Ver detalle</button></td>
          </tr>`;
        })
        .join('');
    }
  }

  render();
  setInterval(render, 30000);
  showFlashIfAny();
})();
