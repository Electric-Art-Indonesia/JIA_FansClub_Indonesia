 
    (() => {
      'use strict';

      const STORAGE_KEY = 'jiaFansClubIndonesia.members.v1';
      const form = document.getElementById('registrationForm');
      const membersGrid = document.getElementById('membersGrid');
      const searchInput = document.getElementById('searchMembers');
      const formMessage = document.getElementById('formMessage');
      const reasonInput = document.getElementById('reason');
      const reasonCount = document.getElementById('reasonCount');
      const memberCount = document.getElementById('memberCount');
      const sideMemberCount = document.getElementById('sideMemberCount');
      const toast = document.getElementById('toast');
      let members = loadMembers();
      let pendingDeleteId = null;
      let lastFocusedElement = null;
      let toastTimer = null;

      const avatars = ['🐰', '🐱', '🐻', '🦊', '🐼', '🐣', '🦄', '🐹', '🐨', '🐥'];
      const avatarFor = (seed) => {
        let sum = 0;
        for (let i = 0; i < String(seed || '').length; i++) sum = (sum * 31 + String(seed)[i].charCodeAt(0)) >>> 0;
        return avatars[sum % avatars.length];
      };
      const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
      const createId = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `jia-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      function loadMembers() {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && item.id && item.email) : [];
        } catch (error) {
          console.warn('Data anggota tidak dapat dibaca dari penyimpanan lokal.', error);
          return [];
        }
      }

      function persistMembers() {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
          return true;
        } catch (error) {
          showToast('Penyimpanan browser penuh atau tidak tersedia. Data belum tersimpan.');
          console.error('Gagal menyimpan anggota.', error);
          return false;
        }
      }

      function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
      }

      function setFormMessage(message, type = '') {
        formMessage.textContent = message;
        formMessage.className = `form-message${type ? ` ${type}` : ''}`;
      }

      function formatDate(value) {
        if (!value) return '—';
        const date = new Date(`${value}T00:00:00`);
        return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
      }

      function formatDateTime(value) {
        if (!value) return '—';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
      }

      function renderMembers() {
        const term = searchInput.value.trim().toLocaleLowerCase('id-ID');
        const filtered = [...members]
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .filter(member => [member.fullName, member.nickname, member.city, member.province, member.bias].join(' ').toLocaleLowerCase('id-ID').includes(term));

        memberCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'starlight' : 'starlight'}`;
        sideMemberCount.textContent = String(members.length);
        membersGrid.replaceChildren();

        if (!filtered.length) {
          const isSearching = Boolean(term);
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.innerHTML = `
            <div class="empty-art" aria-hidden="true">${isSearching ? '🔎💫' : '🌸🐰✨'}</div>
            <h3>${isSearching ? 'Belum ketemu, starlight!' : 'Jadilah starlight pertama!'}</h3>
            <p>${isSearching ? 'Coba kata kunci lain, ya. Nama yang kamu cari mungkin bersembunyi di balik kelopak bunga.' : 'Belum ada data anggota yang tersimpan di browser ini. Isi formulir di atas dan jadilah bagian dari keluarga JIA FC!'}</p>`;
          membersGrid.appendChild(empty);
          return;
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach((member, index) => {
          const card = document.createElement('article');
          card.className = 'member-card';
          card.style.animationDelay = `${Math.min(index * 45, 270)}ms`;
          card.innerHTML = `
            <div class="member-top">
              <div class="member-avatar" aria-hidden="true">${avatarFor(member.nickname || member.fullName)}</div>
              <div class="member-name"><strong>${escapeHTML(member.nickname || member.fullName)}</strong><span>${escapeHTML(member.city || 'Kota belum diisi')}, ${escapeHTML(member.province || '')}</span></div>
            </div>
            <div class="member-chip">${escapeHTML(member.bias || 'JIA Starlight')} ✦</div>
            <div class="member-meta">
              <span>♡ ${escapeHTML(member.fullName)}</span>
              <span>📅 Bergabung ${escapeHTML(formatDateTime(member.createdAt))}</span>
            </div>
            <div class="member-actions">
              <button class="btn btn-secondary btn-small" type="button" data-action="detail" data-id="${escapeHTML(member.id)}">Lihat profil</button>
              <button class="btn btn-quiet btn-small" type="button" data-action="delete" data-id="${escapeHTML(member.id)}" aria-label="Hapus data ${escapeHTML(member.nickname || member.fullName)}">Hapus</button>
            </div>`;
          fragment.appendChild(card);
        });
        membersGrid.appendChild(fragment);
      }

      function openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        lastFocusedElement = document.activeElement;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) setTimeout(() => focusable.focus(), 20);
      }

      function closeModal(modal) {
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        if (!document.querySelector('.modal-backdrop.open')) document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
      }

      function openDetail(id) {
        const member = members.find(item => item.id === id);
        if (!member) return;
        const fields = [
          ['Nama lengkap', member.fullName], ['Nama panggilan', member.nickname], ['Email', member.email], ['WhatsApp', member.whatsapp],
          ['Tanggal lahir', formatDate(member.birthDate)], ['Gender', member.gender || 'Tidak diisi'], ['Provinsi', member.province], ['Kota / kabupaten', member.city],
          ['Bias / favorit', member.bias || 'Tidak diisi'], ['Platform favorit', member.platform || 'Tidak diisi'], ['Tanggal bergabung', formatDateTime(member.createdAt)], ['Cerita singkat', member.reason, true]
        ];
        document.getElementById('detailTitle').textContent = `Profil ${member.nickname || member.fullName} ✦`;
        const content = document.getElementById('detailContent');
        content.innerHTML = `<div class="detail-list">${fields.map(([label, value, full]) => `<div class="detail-item${full ? ' full' : ''}"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value || '—')}</strong></div>`).join('')}</div>`;
        openModal('detailModal');
      }

      function openDelete(id) {
        const member = members.find(item => item.id === id);
        if (!member) return;
        pendingDeleteId = id;
        document.getElementById('deleteMessage').textContent = `Data atas nama “${member.nickname || member.fullName}” akan dihapus dari daftar anggota di browser ini. Data yang sudah dihapus tidak dapat dipulihkan.`;
        openModal('deleteModal');
      }

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        setFormMessage('');
        if (!form.reportValidity()) {
          setFormMessage('Yuk periksa lagi kolom wajib yang masih kosong atau belum valid. 💗', 'error');
          const invalid = form.querySelector(':invalid');
          if (invalid) invalid.focus();
          return;
        }

        const data = new FormData(form);
        const fullName = String(data.get('fullName') || '').trim();
        const nickname = String(data.get('nickname') || '').trim();
        const email = String(data.get('email') || '').trim().toLowerCase();
        const whatsapp = String(data.get('whatsapp') || '').trim();
        const digits = whatsapp.replace(/[^\d]/g, '');
        const birthDate = String(data.get('birthDate') || '');
        const reason = String(data.get('reason') || '').trim();

        if (fullName.length < 2 || nickname.length < 2) {
          setFormMessage('Nama lengkap dan nama panggilan minimal 2 karakter, ya.', 'error');
          return;
        }
        if (digits.length < 8 || digits.length > 16) {
          setFormMessage('Nomor WhatsApp sepertinya belum valid. Masukkan 8–16 digit nomor telepon.', 'error');
          document.getElementById('whatsapp').focus();
          return;
        }
        const currentDate = new Date();
        const currentLocalDate = new Date(currentDate.getTime() - currentDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        if (birthDate && birthDate > currentLocalDate) {
          setFormMessage('Tanggal lahir tidak boleh berada di masa depan.', 'error');
          return;
        }
        if (!reason) {
          setFormMessage('Ceritakan sedikit alasan kamu ingin bergabung, ya. ✨', 'error');
          reasonInput.focus();
          return;
        }
        if (members.some(member => String(member.email).toLowerCase() === email)) {
          setFormMessage('Email ini sudah terdaftar di browser ini. Coba email lain atau cek daftar anggota di bawah.', 'error');
          document.getElementById('email').focus();
          return;
        }

        const member = {
          id: createId(), fullName, nickname, email, whatsapp, birthDate,
          gender: String(data.get('gender') || ''), province: String(data.get('province') || ''), city: String(data.get('city') || '').trim(),
          bias: String(data.get('bias') || ''), platform: String(data.get('platform') || ''), reason,
          createdAt: new Date().toISOString()
        };
        members.push(member);
        if (!persistMembers()) {
          members = members.filter(item => item.id !== member.id);
          renderMembers();
          setFormMessage('Data belum berhasil disimpan. Periksa pengaturan penyimpanan browser kamu.', 'error');
          return;
        }

        renderMembers();
        form.reset();
        reasonCount.textContent = '0';
        setFormMessage('Yeay! Pendaftaran kamu berhasil disimpan. Selamat datang di keluarga starlight! 💖', 'success');
        document.getElementById('successSummary').textContent = `Halo, ${member.nickname}! Kamu sekarang tercatat sebagai bagian dari JIA Fans Club Indonesia. Data kamu disimpan lokal di browser ini. Keep shining! ✨`;
        openModal('successModal');
      });

      form.addEventListener('reset', () => {
        setTimeout(() => {
          reasonCount.textContent = '0';
          setFormMessage('Formulir sudah direset. Isi kembali saat kamu siap, ya! 🌷');
        }, 0);
      });

      reasonInput.addEventListener('input', () => { reasonCount.textContent = String(reasonInput.value.length); });
      searchInput.addEventListener('input', renderMembers);

      membersGrid.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const id = button.dataset.id;
        if (button.dataset.action === 'detail') openDetail(id);
        if (button.dataset.action === 'delete') openDelete(id);
      });

      document.addEventListener('click', (event) => {
        const opener = event.target.closest('[data-open-modal]');
        if (opener) openModal(opener.dataset.openModal);
        const closer = event.target.closest('[data-close-modal], .modal-close');
        if (closer) closeModal(closer.closest('.modal-backdrop'));
      });

      document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (event) => {
          if (event.target === modal) closeModal(modal);
        });
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          const opened = document.querySelector('.modal-backdrop.open');
          if (opened) closeModal(opened);
        }
      });

      document.getElementById('confirmDelete').addEventListener('click', () => {
        if (!pendingDeleteId) return;
        const previous = members;
        members = members.filter(member => member.id !== pendingDeleteId);
        if (!persistMembers()) {
          members = previous;
          renderMembers();
          return;
        }
        pendingDeleteId = null;
        closeModal(document.getElementById('deleteModal'));
        renderMembers();
        showToast('Data anggota telah dihapus dari browser ini.');
      });

      document.getElementById('successViewMembers').addEventListener('click', () => {
        closeModal(document.getElementById('successModal'));
        document.getElementById('anggota').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      function decorateBackground() {
        const ambient = document.getElementById('ambient');
        const symbols = ['✦', '✧', '✿', '❀', '⋆', '♡', '✺', '·'];
        for (let i = 0; i < 46; i++) {
          const item = document.createElement('span');
          const isPetal = ['✿', '❀', '✺'].includes(symbols[i % symbols.length]);
          item.className = isPetal ? 'petal' : 'sparkle';
          item.textContent = symbols[(i * 7 + 3) % symbols.length];
          item.style.left = `${(i * 37 + 11) % 100}%`;
          item.style.top = `${(i * 61 + 5) % 100}%`;
          item.style.fontSize = `${10 + ((i * 13) % 20)}px`;
          item.style.animationDelay = `${(i % 9) * -0.7}s`;
          item.style.animationDuration = `${5 + (i % 7)}s`;
          ambient.appendChild(item);
        }
      }

      const now = new Date();
      const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
      document.getElementById('birthDate').max = localToday;
      decorateBackground();
      renderMembers();
    })();
