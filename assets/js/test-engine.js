/* ================================================================ */
/* == Adalet GYS Portalı - Sınav Arayüzü Eklenti Stilleri (v2.1) == */
/* ================================================================ */
/* Açıklama: Bu dosya, ana tema dosyası olan style.css'e ek        */
/* olarak, sadece sınav arayüzünde kullanılan özel stilleri       */
/* içerir. Renkler ve temel yapı style.css'ten miras alınır.       */
/* ================================================================ */

/* Sınava özel renk değişkenleri */
:root {
    --accent-color: #f59e0b; /* Bayrak rengi */
    --danger-color: #dc2626;
}

/* --- YENİ: İLERLEME ÇUBUĞU (PROGRESS BAR) STİLLERİ --- */
.progress-bar-container {
    background-color: var(--border-color);
    border-radius: 9999px;
    overflow: hidden;
    padding: 4px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.progress-bar {
    height: 10px;
    background-color: var(--primary-color);
    width: 0%; /* JavaScript ile güncellenecek */
    border-radius: 9999px;
    transition: width 0.3s ease-in-out;
}
/* === YENİ STİLLERİN SONU === */


/* Soru metni alanı (pre etiketi) için özel stil */
pre {
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Inter', sans-serif;
    font-size: 1.125rem;
    line-height: 1.8;
    text-align: justify;
    user-select: none;
}

/* Sınavı Başlat Butonu */
.start-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 0.2s ease;
    box-shadow: 0 4px 6px rgba(50, 50, 93, 0.11), 0 1px 3px rgba(0, 0, 0, 0.08);
    background-image: linear-gradient(to right, var(--primary-color), #087f5b);
}

.start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 14px rgba(50, 50, 93, 0.1), 0 3px 6px rgba(0, 0, 0, 0.08);
    background-image: linear-gradient(to right, #087f5b, #065f46);
}

/* Soru üzerindeki bayrak ikonu */
.flag-icon {
    cursor: pointer;
    transition: color 0.2s ease;
}

.flag-icon:hover {
    color: var(--accent-color) !important;
}

#mark-review-btn.marked #flag-solid-icon,
#mark-review-btn.marked #flag-outline-icon {
    color: var(--accent-color);
}

/* Modern soru metni çerçevesi */
#question-text-container {
    background-color: #f0fdfa;
    padding: 1.5rem 2rem;
    border-left: 4px solid var(--primary-color);
    border-radius: 0.5rem;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

/* Seçenek butonu */
.option-btn {
    transition: all 0.2s ease-in-out;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    width: 100%;
    text-align: left;
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    cursor: pointer;
}

.option-btn:hover {
    border-color: #38bdf8;
    background-color: rgba(56, 189, 248, 0.1);
}

/* Seçilen seçenek */
.option-selected {
    border-color: var(--primary-color);
    background-color: rgba(13, 148, 136, 0.1);
    color: var(--primary-color);
    font-weight: 600;
}

/* Seçenek tuşu (A, B, C, D, E) */
.option-key {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 2rem;
    width: 2rem;
    border-radius: 9999px;
    border: 1px solid var(--border-color);
    font-weight: bold;
    margin-right: 1rem;
}

.option-selected .option-key {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
}

/* Zamanlayıcı uyarı efekti */
.timer-warning {
    color: var(--danger-color);
    animation: pulse 1.2s infinite;
    font-weight: bold;
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Soru açıklamaları kutusu */
.explanation-box {
    background-color: #f0f9ff;
    border-left: 4px solid #38bdf8;
    padding: 1.25rem;
    margin-top: 1.25rem;
    border-radius: 0.5rem;
}

.explanation-section { margin-top: 1rem; }
.explanation-section h5 { font-weight: 600; color: #0c4a6e; display: flex; align-items: center; }
.explanation-section p { font-size: 0.95rem; line-height: 1.7; color: #0c4a6e; text-align: justify; }

/* Soru Gezgini Kutucuğu */
.nav-box {
    transition: all 0.2s ease-in-out;
    cursor: pointer;
}

/* Sonuç Ekranı Sekme Butonları */
.tab-btn {
    transition: all 0.2s ease-in-out;
    border-radius: 0.5rem;
    padding: 0.75rem 1rem;
    font-weight: 600;
    background-color: #e2e8f0;
    color: #475569;
    border: 2px solid transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.tab-btn:hover {
    background-color: #cbd5e1;
    transform: translateY(-1px);
}

.tab-active {
    background-color: #f0fdfa;
    color: var(--primary-color) !important;
    border-color: var(--primary-color);
}

/* Erişilebilirlik için Gizli Element */
#timer-announcer {
    position: absolute;
    left: -10000px;
    top: auto;
    width: 1px;
    height: 1px;
    overflow: hidden;
}
