// ===================================================================================
// UYGULAMA MANTIĞI (deneme-1.html ile Uyumlu)
// ===================================================================================

class JusticeExamApp {
    constructor() {
        this.domElements = this.initializeDOMElements();
        if (!this.domElements.appContainer) {
            console.error("Sınav konteyneri bulunamadı, test motoru başlatılmadı.");
            return;
        }
        // GOOGLE_SHEET_URL'i HTML dosyasındaki data attribute'tan al
        this.GOOGLE_SHEET_URL = this.domElements.appContainer.dataset.sheetUrl;
        this.examManager = null;
        this.uiManager = null;
        this.modalManager = null;
        // Uygulama başlatıldığında veri çekimini başlat
        this.fetchAndParseSheetData();
    }

    initializeDOMElements() {
        return {
            appContainer: document.getElementById('app-container'), // URL'i okumak için
            welcomeScreen: document.getElementById('welcome-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            startExamBtn: document.getElementById('start-exam-btn'),
            elapsedTime: document.getElementById('elapsed-time'),
            remainingTime: document.getElementById('remaining-time'),
            timerAnnouncer: document.getElementById('timer-announcer'), // Olmayabilir, ama tanımlayalım
            counter: document.getElementById('question-counter'),
            questionText: document.getElementById('question-text'),
            optionsContainer: document.getElementById('options-container'),
            prevBtn: document.getElementById('prev-btn'),
            nextBtn: document.getElementById('next-btn'),
            markReviewBtn: document.getElementById('mark-review-btn'),
            finishBtn: document.getElementById('finish-btn'),
            navPalette: document.getElementById('nav-palette-container'),
            resultModal: document.getElementById('result-modal'),
            correctCount: document.getElementById('correct-count'),
            incorrectCount: document.getElementById('incorrect-count'),
            emptyCount: document.getElementById('empty-count'),
            successRate: document.getElementById('success-rate'),
            successRateBox: document.getElementById('success-rate-box'),
            successText: document.getElementById('success-text'),
            performanceSummary: document.getElementById('performance-summary'),
            wrongAnswersContainer: document.getElementById('wrong-answers-container'),
            markedQuestionsContainer: document.getElementById('marked-questions-container'),
            wrongAnswersTab: document.getElementById('wrong-answers-tab'),
            markedQuestionsTab: document.getElementById('marked-questions-tab'),
            wrongAnswersPanel: document.getElementById('wrong-answers-panel'),
            markedQuestionsPanel: document.getElementById('marked-questions-panel'),
            startBtnFullText: document.getElementById('start-btn-full-text'),
            totalQuestionCount: document.getElementById('total-question-count'),
            totalDurationDisplay: document.getElementById('total-duration-display'),
            alertModal: document.getElementById('alert-modal'),
            alertModalTitle: document.getElementById('alert-modal-title'),
            alertModalMessage: document.getElementById('alert-modal-message'),
            alertModalOkBtn: document.getElementById('alert-modal-ok-btn'),
            restartBtn: document.getElementById('restart-btn'),
            closeResultModalBtn: document.getElementById('close-result-modal-btn'),
            flagOutlineIcon: document.getElementById('flag-outline-icon'),
            flagSolidIcon: document.getElementById('flag-solid-icon'),
            warningBox: document.getElementById('warning-box'),
            warningMessage: document.getElementById('warning-message'),
        };
    }

    // Uygulamayı başlatma fonksiyonu
    initializeApp(questionPool) {
        // Temel kontroller
        if (!Array.isArray(questionPool) || questionPool.length === 0) {
            this.showError("Google Sheet'ten soru verisi alınamadı veya format hatalı.");
            return;
        }

        // UI'yi güncelle
        const calculatedDuration = Math.ceil(questionPool.length * 1.2); // Dakika
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = `&nbsp;${calculatedDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;

        // ExamManager, UIManager, ModalManager örneklerini oluştur
        this.examManager = new ExamManager(questionPool, calculatedDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);

        // Event listener'ları bağla
        this.bindEventListeners();
    }

    // Hata mesajı gösterme fonksiyonu
    showError(message) {
        const startExamBtn = this.domElements.startExamBtn;
        const startBtnFullText = this.domElements.startBtnFullText;
        const totalQuestionCount = this.domElements.totalQuestionCount;
        const warningBox = this.domElements.warningBox;
        const warningMessage = this.domElements.warningMessage;

        if (startExamBtn) startExamBtn.disabled = true;
        if (startBtnFullText) startBtnFullText.textContent = "HATA OLUŞTU";
        if (totalQuestionCount) totalQuestionCount.textContent = "0";
        if (warningMessage) warningMessage.textContent = message;
        if (warningBox) warningBox.classList.remove('hidden');
        console.error("Uygulama başlatma hatası:", message); // Konsola da yaz
    }

    // Event listener'ları bağlama
    bindEventListeners() {
        if (this.domElements.startExamBtn) {
            this.domElements.startExamBtn.addEventListener('click', () => this.startExam());
        }
        if (this.domElements.restartBtn) {
            this.domElements.restartBtn.addEventListener('click', () => window.location.reload());
        }
        if (this.domElements.closeResultModalBtn) {
            this.domElements.closeResultModalBtn.addEventListener('click', () => {
                 if (this.domElements.resultModal) {
                    this.domElements.resultModal.classList.add('hidden');
                 }
                 if (this.domElements.welcomeScreen) {
                    this.domElements.welcomeScreen.classList.remove('hidden');
                 }
                 // Sınavı sıfırla
                 window.location.reload();
            });
        }
        // Eğer bu elementler tanımlıysa, event listener ekle
        if (this.domElements.wrongAnswersTab && this.domElements.markedQuestionsTab && this.uiManager) {
            this.domElements.wrongAnswersTab.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
            this.domElements.markedQuestionsTab.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
        }
    }

    // Sınavı başlatma
    startExam() {
        if (this.domElements.welcomeScreen) {
            this.domElements.welcomeScreen.classList.add('hidden');
        }
        if (this.examManager) {
            this.examManager.startExam();
        }
    }

    // GOOGLE_SHEET_URL'i güvenli bir şekilde satırlara ayıran fonksiyon
    robustCsvParse(csvText) {
        const rows = [];
        let currentRow = '';
        let inQuotes = false;
        // Farklı satır sonu karakterlerini normalize et
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            if (char === '"') {
                // Kaçışlı çift tırnak ("") kontrolü
                if (inQuotes && normalizedText[i + 1] === '"') {
                    currentRow += '"';
                    i++; // Bir sonraki " karakterini atla
                } else {
                    // Tırnak durumunu değiştir
                    inQuotes = !inQuotes;
                }
            } else if (char === '\n' && !inQuotes) {
                // Tırnak içinde değilsek ve yeni satıra geldiysek, satırı tamamla
                if (currentRow) {
                    rows.push(currentRow);
                }
                currentRow = ''; // Yeni satır için sıfırla
            } else {
                // Normal karakterleri satıra ekle
                currentRow += char;
            }
        }

        // Son satırı da ekle (dosya \n ile bitmeyebilir)
        if (currentRow) {
            rows.push(currentRow);
        }

        return rows;
    }

    // Tek bir CSV satırını değer dizisine ayıran fonksiyon
    parseCsvRow(row) {
        const values = [];
        let currentVal = '';
        let inQuotes = false;

        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') {
                // Kaçışlı çift tırnak ("") kontrolü
                if (inQuotes && row[i + 1] === '"') {
                    currentVal += '"';
                    i++; // Bir sonraki " karakterini atla
                } else {
                    // Tırnak durumunu değiştir
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Virgülle ayrılmış değeri ekle ve sıfırla
                values.push(currentVal);
                currentVal = '';
            } else {
                // Normal karakterleri değere ekle
                currentVal += char;
            }
        }
        // Son değeri de ekle
        values.push(currentVal);

        // Değerleri temizle (başında/sonunda tırnakları kaldır, boşlukları temizle)
        return values.map(v => v.trim().replace(/^"|"$/g, ''));
    }

    // Google Sheet'ten veri çekip işleyen ana fonksiyon
    async fetchAndParseSheetData() {
        if (!this.GOOGLE_SHEET_URL) {
            this.showError("Google Sheet linki bulunamadı.");
            return;
        }

        try {
            // 1. Veriyi çek
            const response = await fetch(this.GOOGLE_SHEET_URL);
            if (!response.ok) {
                throw new Error(`Ağ yanıtı başarısız: ${response.status} ${response.statusText}`);
            }
            const csvText = await response.text();
            if (!csvText) {
                throw new Error("CSV verisi boş.");
            }

            // 2. CSV'yi satırlara ayır
            const rows = this.robustCsvParse(csvText);
            if (rows.length < 2) { // Başlık + en az 1 soru satırı gerekli
                throw new Error("CSV dosyasında yeterli veri bulunamadı (başlık ve en az bir soru satırı olmalı).");
            }

            // 3. Başlıkları al
            const headers = this.parseCsvRow(rows[0]);
            const requiredHeaders = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                throw new Error(`Eksik başlıklar: ${missingHeaders.join(', ')}`);
            }

            // 4. Soruları işle
            const questionPool = rows.slice(1) // Başlık satırını atla
                .map(row => {
                    if (!row) return null; // Boş satırı atla
                    const values = this.parseCsvRow(row);
                    // Satır, başlık sayısı kadar sütun içermiyorsa atla
                    if (values.length < headers.length) return null;

                    // Başlıklara göre obje oluştur
                    const data = headers.reduce((obj, h, i) => {
                        obj[h] = values[i] || ''; // Eksik hücreler için boş string
                        return obj;
                    }, {});

                    // Soru objesini oluştur
                    return {
                        questionText: data.questionText,
                        options: {
                            A: data.optionA,
                            B: data.optionB,
                            C: data.optionC,
                            D: data.optionD,
                            E: data.optionE || '' // E seçeneği olmayabilir
                        },
                        correctAnswer: data.correctAnswer,
                        explanation: data.explanation || '' // Açıklama olmayabilir
                    };
                })
                // Geçersiz (null) soruları filtrele
                .filter(q => q && q.questionText && q.correctAnswer); // Sadece metni ve doğru cevabı olan soruları al

            if (questionPool.length === 0) {
                throw new Error("Hiç geçerli soru bulunamadı. Lütfen Google Sheet dosyanızın formatını kontrol edin.");
            }

            // 5. Veri başarıyla çekildiyse, uygulamayı başlat
            console.log("Sorular başarıyla çekildi:", questionPool); // Debug için
            this.initializeApp(questionPool); // Uygulamayı başlat

        } catch (error) {
            console.error('Veri çekme hatası:', error); // Tarayıcı konsoluna yaz
            this.showError(`Sorular çekilirken hata oluştu: ${error.message}`); // Kullanıcıya göster
        }
    }
}

// ExamManager sınıfı
class ExamManager {
    constructor(questions, durationMinutes, app) {
        this.questions = questions;
        this.durationMinutes = durationMinutes;
        this.app = app; // JusticeExamApp örneğine referans
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        this.timeRemaining = 0;
        // VisibilityChange handler için bağlama (arrow function)
        this.handleVisibilityChange = () => {
            if (document.hidden) {
                if (this.app.modalManager) {
                    this.app.modalManager.show({
                        title: 'UYARI',
                        message: 'Sınav sırasında başka bir sekmeye geçtiniz. Lütfen sınava odaklanın.'
                    });
                }
            }
        };
    }

    startExam() {
        // Kullanıcı cevaplarını başlat (her soru için null ve işaretlenmemiş)
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({
            userAnswer: null,
            isMarkedForReview: false
        }));

        // Zamanlayıcıyı başlat
        this.timeRemaining = this.durationMinutes * 60; // Dakikayı saniyeye çevir
        
        // Sınav ekranını göster
        if (this.app.domElements.quizScreen) {
            this.app.domElements.quizScreen.classList.remove('hidden');
        }

        // Zamanlayıcıyı başlat
        this.startTimer();

        // İlk soruyu render et
        if (this.app.uiManager) {
            this.app.uiManager.renderQuestion();
            // Quiz event listener'larını bağla
            this.app.uiManager.bindQuizEvents();
        }
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    goToNextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.currentQuestionIndex++;
            if (this.app.uiManager) {
                this.app.uiManager.renderQuestion();
            }
        }
    }

    goToPrevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            if (this.app.uiManager) {
                this.app.uiManager.renderQuestion();
            }
        }
    }

    selectAnswer(optionKey) {
        // Kullanıcının cevabını kaydet
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        
        // UI'yi güncelle (seçilen seçeneği vurgula)
        if (this.app.uiManager) {
            this.app.uiManager.renderQuestion();
        }

        // Otomatik ilerleme (isteğe bağlı): Son soru değilse, bir sonraki soruya geç
        // Not: Bu davranış isteğe bağlıdır. Şu an yorum yapılmış durumda.
        /*
        if (this.currentQuestionIndex < this.questions.length - 1) {
             // Küçük bir gecikme ekleyerek kullanıcıya seçiminin yansıdığını göster
            setTimeout(() => {
                this.goToNextQuestion();
            }, 200); // 200ms gecikme
        }
        */
    }

    toggleMarkForReview() {
        // Mevcut işaret durumunu tersine çevir
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = 
            !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        
        // UI'yi güncelle (soru gezgini ve buton)
        if (this.app.uiManager) {
            this.app.uiManager.updateNavPalette();
            this.app.uiManager.updateButtonStates(); // Bayrak butonunun durumunu güncelle
        }
    }

    navigateToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index;
            if (this.app.uiManager) {
                this.app.uiManager.renderQuestion();
            }
        }
    }

    finishQuiz(isAuto = false) {
        if (isAuto) {
            // Süre dolduğunda otomatik bitir
            this.performFinish();
        } else {
            // Kullanıcı butona tıkladığında onay iste
            if (this.app.modalManager) {
                this.app.modalManager.show({
                    title: 'Sınavı Bitir',
                    message: 'Sınavı bitirmek istediğinizden emin misiniz?',
                    onConfirm: () => this.performFinish() // Onaylanırsa bitir
                });
            }
        }
    }

    performFinish() {
        // Zamanlayıcıyı durdur
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        // VisibilityChange event listener'ını kaldır
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        // Sonuçları hesapla
        let correct = 0;
        let incorrect = 0;
        let empty = 0;
        const incorrectQuestions = []; // Yanlış cevaplanan sorular
        const markedQuestions = []; // İşaretlenen sorular

        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];

            // İşaretlenen soruları topla
            if (userAnswerData.isMarkedForReview) {
                markedQuestions.push({
                    question: q,
                    index: i,
                    userAnswer: userAnswerData.userAnswer
                });
            }

            // Cevap durumuna göre sayaçları güncelle
            if (!userAnswerData.userAnswer) {
                empty++;
            } else if (userAnswerData.userAnswer === q.correctAnswer) {
                correct++;
            } else {
                incorrect++;
                // Yanlış cevaplanan soruları topla
                incorrectQuestions.push({
                    question: q,
                    index: i,
                    userAnswer: userAnswerData.userAnswer
                });
            }
        });

        const totalQuestions = this.questions.length;
        const successPercentage = totalQuestions > 0 ? (correct / totalQuestions * 100) : 0;

        // DOM elementlerini güncelle
        if (this.app.domElements.correctCount) this.app.domElements.correctCount.textContent = correct;
        if (this.app.domElements.incorrectCount) this.app.domElements.incorrectCount.textContent = incorrect;
        if (this.app.domElements.emptyCount) this.app.domElements.emptyCount.textContent = empty;
        if (this.app.domElements.successRate) this.app.domElements.successRate.textContent = `${successPercentage.toFixed(1)}%`;

        // Başarı oranına göre stil ve mesaj güncelle
        if (this.app.uiManager) {
             this.app.uiManager.updateSuccessRateAppearance(successPercentage);
        }

        // Quiz ekranını gizle, sonuç modalini göster
        if (this.app.domElements.quizScreen) {
            this.app.domElements.quizScreen.classList.add('hidden');
        }
        if (this.app.domElements.resultModal) {
            this.app.domElements.resultModal.classList.remove('hidden');
            this.app.domElements.resultModal.focus(); // Erişilebilirlik için
        }

        // Sonuçları modal içinde render et
        if (this.app.uiManager) {
             this.app.uiManager.renderResultsPage(incorrectQuestions, markedQuestions);
        }
    }

    startTimer() {
        // VisibilityChange event listener'ı ekle
        document.addEventListener('visibilitychange', this.handleVisibilityChange);

        const totalDuration = this.durationMinutes * 60; // Toplam süreyi saniye cinsinden al

        // Başlangıçta kalan süreyi göster
        if (this.app.domElements.remainingTime) {
            this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
        }
        // Başlangıçta geçen süreyi sıfırla
        if (this.app.domElements.elapsedTime) {
            this.app.domElements.elapsedTime.textContent = this.formatTime(0);
        }

        // Timer'ı sıfırla (varsa)
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }

        // Uyarı sınıfını kaldır
        if (this.app.domElements.remainingTime) {
            this.app.domElements.remainingTime.classList.remove('timer-warning');
        }

        // Her saniyede bir çalışan timer
        this.timerInterval = setInterval(() => {
            // Süre doldu mu?
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.finishQuiz(true); // Otomatik bitir
                return;
            }

            // Süreyi azalt
            this.timeRemaining--;

            // Kalan süreyi güncelle
            if (this.app.domElements.remainingTime) {
                this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            }

            // Geçen süreyi hesapla ve güncelle
            const elapsedSecondsTotal = totalDuration - this.timeRemaining;
            if (this.app.domElements.elapsedTime) {
                this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSecondsTotal);
            }

            // Son 5 dakika uyarısı (300 saniye = 5 dakika)
            if (this.timeRemaining <= 300 && this.app.domElements.remainingTime && !this.app.domElements.remainingTime.classList.contains('timer-warning')) {
                this.app.domElements.remainingTime.classList.add('timer-warning');
                // Ekran okuyucular için duyuru (varsa)
                if (this.app.domElements.timerAnnouncer) {
                    this.app.domElements.timerAnnouncer.textContent = 'Sınavın bitmesine son 5 dakika kaldı.';
                }
            }
        }, 1000); // 1 saniye
    }
}

class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements;
        this.examManager = examManager;
    }

    renderQuestion() {
        const question = this.examManager.questions[this.examManager.currentQuestionIndex];

        // Soru numarasını güncelle
        if (this.dom.counter) {
            this.dom.counter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`;
        }

        // Soru metnini güncelle (Numarayı temizle)
        if (this.dom.questionText) {
            const cleanQuestionText = question.questionText.replace(/^\d+[\.\)-]\s*/, ''); // Başındaki "1)", "1.", "1-" gibi ifadeleri kaldır
            this.dom.questionText.textContent = cleanQuestionText;
        }

        // Seçenekleri temizle
        if (this.dom.optionsContainer) {
            this.dom.optionsContainer.innerHTML = '';
        }

        // Seçenekleri oluştur ve ekle
        if (this.dom.optionsContainer) {
            Object.entries(question.options).forEach(([key, optionText]) => {
                // Sadece dolu seçenekleri ekle
                if (optionText) {
                    const button = this.createOptionButton(key, optionText);
                    this.dom.optionsContainer.appendChild(button);
                }
            });
        }

        // Soru gezgini ve buton durumlarını güncelle
        this.updateNavPalette();
        this.updateButtonStates();
    }

    createOptionButton(key, optionText) {
        const button = document.createElement('button');
        // Kullanıcının bu soruya verdiği cevabı al
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key;

        // Temel sınıf ve erişilebilirlik özellikleri
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg';
        button.setAttribute('role', 'radio'); // Tek seçim olduğu için radio
        button.setAttribute('aria-checked', isSelected ? 'true' : 'false'); // Seçili durumu

        // HTML içeriği: Seçenek tuşu ve metin
        // Seçenek tuşu (A, B, C, D)
        const optionKeySpan = document.createElement('span');
        optionKeySpan.className = 'option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4';
        optionKeySpan.textContent = key;

        // Seçenek metni
        const optionTextSpan = document.createElement('span');
        optionTextSpan.className = 'text-justify w-full'; // Metni iki yana yasla
        optionTextSpan.textContent = optionText;

        // Span'ları butona ekle
        button.appendChild(optionKeySpan);
        button.appendChild(optionTextSpan);

        // Eğer bu seçenek seçildiyse, özel sınıf ekle
        if (isSelected) {
            button.classList.add('option-selected');
        }

        // Tıklama event'i
        button.onclick = () => {
            this.examManager.selectAnswer(key);
        };

        return button;
    }

    updateNavPalette() {
        // Soru gezgini kutularını temizle
        if (this.dom.navPalette) {
            this.dom.navPalette.innerHTML = '';
        }

        // Her soru için bir kutu oluştur
        if (this.dom.navPalette) {
            this.examManager.questions.forEach((_, index) => {
                const box = document.createElement('button');
                box.textContent = index + 1; // Kutu içeriği (soru numarası)
                box.setAttribute('aria-label', `Soru ${index + 1}'ye git`); // Erişilebilirlik

                // Duruma göre sınıf belirle
                let statusClass = ' bg-slate-300 hover:bg-slate-400'; // Varsayılan (boş)
                if (this.examManager.userAnswers[index].isMarkedForReview) {
                    // İşaretli
                    statusClass = ' bg-yellow-400 text-white hover:bg-yellow-500';
                } else if (this.examManager.userAnswers[index].userAnswer) {
                    // Cevaplanmış
                    statusClass = ' bg-green-500 text-white hover:bg-green-600';
                }
                // Aktif soru için özel stil
                let ringClass = index === this.examManager.currentQuestionIndex ? ' ring-4 ring-offset-2 ring-teal-500 scale-110 z-10' : '';

                // Kutuya sınıf ekle
                box.className = `nav-box w-full h-10 flex items-center justify-center rounded-md border border-transparent${statusClass}${ringClass}`;

                // Tıklama event'i
                box.onclick = () => {
                    this.examManager.navigateToQuestion(index);
                };

                // Kutuyu konteynere ekle
                this.dom.navPalette.appendChild(box);
            });
        }
    }

    updateButtonStates() {
        // Önceki ve Sonraki butonlarının durumunu güncelle
        if (this.dom.prevBtn) {
            this.dom.prevBtn.disabled = this.examManager.currentQuestionIndex === 0;
        }
        if (this.dom.nextBtn) {
            this.dom.nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1;
        }

        // İşaretleme butonunun durumunu güncelle
        const isMarked = this.examManager.userAnswers[this.examManager.currentQuestionIndex].isMarkedForReview;
        if (this.dom.markReviewBtn) {
            // CSS sınıflarını toggle ile yönet
            this.dom.markReviewBtn.classList.toggle('marked', isMarked);
        }
        if (this.dom.flagOutlineIcon) {
            this.dom.flagOutlineIcon.classList.toggle('hidden', isMarked);
        }
        if (this.dom.flagSolidIcon) {
            this.dom.flagSolidIcon.classList.toggle('hidden', !isMarked);
        }
    }

    renderResultsPage(incorrectQuestions, markedQuestions) {
        // Yanlış cevaplar panelini doldur
        this.renderWrongAnswers(incorrectQuestions);
        // İşaretlenen sorular panelini doldur
        this.renderMarkedQuestions(markedQuestions);
    }

    // Yanlış cevaplar için HTML seçeneklerini oluşturan yardımcı fonksiyon
    _createResultOptionsHTML(q, userAnswer) {
        let optionsHTML = '<div class="space-y-2 mt-4 text-sm">'; // Dış div ve stil

        // Her bir seçeneği kontrol et
        for (const [key, text] of Object.entries(q.options)) {
            if (!text) continue; // Boş seçeneği atla

            let classes = 'border-slate-200 bg-slate-50 text-slate-700'; // Varsayılan stil
            let icon = `<span class="font-bold text-slate-500">${key})</span>`; // Varsayılan simge (sadece harf)

            // Doğru cevap kontrolü
            if (key === q.correctAnswer) {
                classes = 'border-green-400 bg-green-50 text-green-800 font-medium'; // Yeşil stil
                // SVG tik simgesi
                icon = `<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            
            // Kullanıcının verdiği yanlış cevap kontrolü
            } else if (key === userAnswer) {
                classes = 'border-red-400 bg-red-50 text-red-800 font-medium'; // Kırmızı stil
                // SVG çarpı simgesi
                icon = `<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            }

            // HTML'i oluştur ve ekle
            optionsHTML += `
                <div class="flex items-start p-3 rounded-lg border ${classes}">
                    <div class="flex-shrink-0 w-5 h-5 mr-3">${icon}</div>
                    <p class="text-justify flex-1">${text}</p>
                </div>
            `;
        }
        optionsHTML += '</div>'; // Dış div'i kapat
        return optionsHTML;
    }

    renderWrongAnswers(incorrectQuestions) {
        const container = this.dom.wrongAnswersContainer;
        if (!container) return; // Element yoksa çık
        container.innerHTML = ''; // Önce temizle

        // Eğer yanlış soru yoksa, kutlu mesaj göster
        if (incorrectQuestions.length === 0) {
            container.innerHTML = `<p class="text-green-600 p-4 bg-green-50 rounded-lg">Tebrikler! Yanlış cevabınız bulunmuyor.</p>`;
            return;
        }

        // Her bir yanlış soruyu işle
        incorrectQuestions.forEach((item) => {
            const q = item.question; // Soru objesi
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200"; // Stil

            // Soru metnini temizle
            const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');

            // Açıklama kutusunu hazırla (varsa)
            let explanationHTML = '';
            if (q.explanation) {
                // "Hafıza Tekniği:" ayracını bul
                const separator = "Hafıza Tekniği:";
                let fullExplanation = q.explanation;
                let konuOzeti = "";
                let hafizaTeknigi = "";

                const separatorIndex = fullExplanation.indexOf(separator);

                if (separatorIndex !== -1) {
                    // Ayracı bulduysak, metni ikiye ayır
                    hafizaTeknigi = fullExplanation.substring(separatorIndex + separator.length).trim();
                    // "Konu Özeti:" kısmını ayır (varsayılan olarak tüm metin, ayraca kadar olan kısım)
                    konuOzeti = fullExplanation.substring(0, separatorIndex).replace("Konu Özeti:", "").trim();
                } else {
                    // Ayrac yoksa, tüm açıklamayı konu özeti olarak kabul et
                     konuOzeti = fullExplanation.replace("Konu Özeti:", "").trim();
                }

                // Açıklama HTML'sini oluştur
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4>`;
                
                // Konu Özeti bölümü (varsa)
                if(konuOzeti) {
                     explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`;
                }
               
                // Hafıza Tekniği bölümü (varsa)
                if(hafizaTeknigi) {
                    explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`;
                }
                
                explanationHTML += `</div>`; // explanation-box'u kapat
            }

            // HTML içeriğini oluştur ve ekle
            resultItemDiv.innerHTML = `
                <p class="font-bold mb-2">Soru ${item.index + 1}:</p>
                <pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>
                ${this._createResultOptionsHTML(q, item.userAnswer)}
                ${explanationHTML}
            `;
            container.appendChild(resultItemDiv);
        });
    }

    renderMarkedQuestions(markedQuestions) {
        const container = this.dom.markedQuestionsContainer;
        if (!container) return; // Element yoksa çık
        container.innerHTML = ''; // Önce temizle

        // Eğer işaretli soru yoksa, bilgi mesajı göster
        if (markedQuestions.length === 0) {
            container.innerHTML = `<p class="text-slate-600 p-4 bg-slate-50 rounded-lg">İncelemek için herhangi bir soru işaretlemediniz.</p>`;
            return;
        }

        // Her bir işaretli soruyu işle
        markedQuestions.forEach((item) => {
            const q = item.question; // Soru objesi
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200"; // Stil

            // Soru durumu (Doğru/Yanlış/Boş)
            const isCorrect = item.userAnswer === q.correctAnswer;
            const statusText = item.userAnswer ? (isCorrect ? 'Doğru Cevaplandı' : 'Yanlış Cevaplandı') : 'Boş Bırakıldı';
            const statusColor = item.userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-slate-600';

            // Soru metnini temizle
            const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');

             // Açıklama kutusunu hazırla (varsa)
            let explanationHTML = '';
            if (q.explanation) {
                // "Hafıza Tekniği:" ayracını bul
                const separator = "Hafıza Tekniği:";
                let fullExplanation = q.explanation;
                let konuOzeti = "";
                let hafizaTeknigi = "";

                const separatorIndex = fullExplanation.indexOf(separator);

                if (separatorIndex !== -1) {
                    // Ayracı bulduysak, metni ikiye ayır
                    hafizaTeknigi = fullExplanation.substring(separatorIndex + separator.length).trim();
                    // "Konu Özeti:" kısmını ayır (varsayılan olarak tüm metin, ayraca kadar olan kısım)
                    konuOzeti = fullExplanation.substring(0, separatorIndex).replace("Konu Özeti:", "").trim();
                } else {
                    // Ayrac yoksa, tüm açıklamayı konu özeti olarak kabul et
                     konuOzeti = fullExplanation.replace("Konu Özeti:", "").trim();
                }

                // Açıklama HTML'sini oluştur
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4>`;
                
                // Konu Özeti bölümü (varsa)
                if(konuOzeti) {
                     explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`;
                }
               
                // Hafıza Tekniği bölümü (varsa)
                if(hafizaTeknigi) {
                    explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`;
                }
                
                explanationHTML += `</div>`; // explanation-box'u kapat
            }

            // HTML içeriğini oluştur ve ekle
            resultItemDiv.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <p class="font-bold">Soru ${item.index + 1}:</p>
                    <span class="text-sm font-semibold ${statusColor}">${statusText}</span>
                </div>
                <pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>
                ${this._createResultOptionsHTML(q, item.userAnswer)}
                ${explanationHTML}
            `;
            container.appendChild(resultItemDiv);
        });
    }

    updateSuccessRateAppearance(percentage) {
        const box = this.dom.successRateBox;
        const text = this.dom.successText;
        const summary = this.dom.performanceSummary;

        if (!box || !text || !summary) return; // Elementlerden biri yoksa çık

        // Önceki sınıfları temizle
        box.className = 'p-4 rounded-lg';
        text.className = '';

        if (percentage >= 90) {
            box.classList.add('bg-green-100');
            text.classList.add('text-green-800');
            summary.textContent = "Mükemmel! Konulara tamamen hakimsin.";
        } else if (percentage >= 70) {
            box.classList.add('bg-green-100');
            text.classList.add('text-green-800');
            summary.textContent = "Harika bir sonuç! Başarın göz dolduruyor.";
        } else if (percentage >= 50) {
            box.classList.add('bg-yellow-100');
            text.classList.add('text-yellow-800');
            summary.textContent = "İyi bir başlangıç. Yanlış yaptığın ve işaretlediğin konuları tekrar etmen faydalı olacaktır.";
        } else {
            box.classList.add('bg-red-100');
            text.classList.add('text-red-800');
            summary.textContent = "Konuları tekrar gözden geçirmende fayda var. Pes etme!";
        }
        // Başarı yazısı
        if (text) text.textContent = 'Başarı';
    }

    switchResultTab(tabName) {
        if (!this.dom.wrongAnswersPanel || !this.dom.markedQuestionsPanel || !this.dom.wrongAnswersTab || !this.dom.markedQuestionsTab) return;
        if (tabName === 'wrong') {
            this.dom.wrongAnswersPanel.classList.remove('hidden');
            this.dom.markedQuestionsPanel.classList.add('hidden');
            this.dom.wrongAnswersTab.classList.add('tab-active');
            this.dom.markedQuestionsTab.classList.remove('tab-active');
        } else if (tabName === 'marked') {
            this.dom.wrongAnswersPanel.classList.add('hidden');
            this.dom.markedQuestionsPanel.classList.remove('hidden');
            this.dom.wrongAnswersTab.classList.remove('tab-active');
            this.dom.markedQuestionsTab.classList.add('tab-active');
        }
    }

    // Quiz ekranındaki butonlara event listener bağla
    bindQuizEvents() {
        // Önceki, Sonraki, İşaretle, Bitir butonları
        if (this.dom.nextBtn) {
            this.dom.nextBtn.addEventListener('click', () => {
                this.examManager.goToNextQuestion();
            });
        }

        if (this.dom.prevBtn) {
            this.dom.prevBtn.addEventListener('click', () => {
                this.examManager.goToPrevQuestion();
            });
        }

        if (this.dom.markReviewBtn) {
            this.dom.markReviewBtn.addEventListener('click', () => {
                this.examManager.toggleMarkForReview();
            });
        }

        if (this.dom.finishBtn) {
            this.dom.finishBtn.addEventListener('click', () => {
                this.examManager.finishQuiz(false); // Onay iste
            });
        }
    }
}

class ModalManager {
    constructor(domElements) {
        this.dom = domElements;
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Alert modal'ındaki "Tamam" butonuna event bağla
        if (this.dom.alertModalOkBtn) {
            this.dom.alertModalOkBtn.addEventListener('click', () => {
                this.hide(); // Modal'i gizle
            });
        }
    }

    // Alert modal'ı göster
    show(config) {
        if (!this.dom.alertModal || !this.dom.alertModalTitle || !this.dom.alertModalMessage || !this.dom.alertModalOkBtn) return;
        // Başlık ve mesajı güncelle
        this.dom.alertModalTitle.textContent = config.title;
        this.dom.alertModalMessage.textContent = config.message;

        // Modal'i görünür yap
        this.dom.alertModal.classList.remove('hidden');
        this.dom.alertModal.classList.add('flex'); // Flex kullanarak merkezleme

        // "Tamam" butonuna odaklan (erişilebilirlik)
        this.dom.alertModalOkBtn.focus();

        // "Tamam" butonuna özel onay fonksiyonu bağla
        this.dom.alertModalOkBtn.onclick = () => {
            this.hide(); // Modal'i gizle
            if (config.onConfirm) {
                config.onConfirm(); // Onay fonksiyonunu çalıştır
            }
        };
    }

    // Alert modal'ı gizle
    hide() {
        if (this.dom.alertModal) {
            this.dom.alertModal.classList.add('hidden');
            this.dom.alertModal.classList.remove('flex');
        }
    }
}


// Sadece deneme sınavı veya test sayfalarında bu motoru çalıştır.
// 'app-container' ID'li bir element varsa, uygulamayı başlat.
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-container')) {
        new JusticeExamApp();
    }
});
