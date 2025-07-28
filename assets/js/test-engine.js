/**
 * @file Adalet GYS Portalı için Merkezi Sınav Motoru
 * @description Bu dosya, Google E-Tablolar'dan soru verilerini çeken, kullanıcı arayüzünü yöneten ve sınavın tamamını kontrol eden ana mantığı içerir.
 *              Tüm sınav sayfaları (örneğin deneme-1.html) bu betiği yükler. Betik, DOM'da gerekli elementleri bulur ve sınav uygulamasını başlatır.
 *              Sınav mantığı, UI yönetimi ve modal pencereleri farklı sınıflar tarafından yürütülür.
 *
 * @author [Sizin Adınız]
 * @version 1.2 (Template-Based Architecture, Enhanced Debugging)
 * @since 2024
 *
 * @requires /adalet-gys-portal/assets/js/template-loader.js - Şablonun yüklenmesini bekler. `template-loaded` event'ini dinler.
 * @requires /adalet-gys-portal/_templates/sinav-sablonu.html - Sınav UI'sinin bulunduğu HTML şablonu.
 * @requires /adalet-gys-portal/assets/css/test.css - Sınav UI'si için özel stiller.
 */


/**
 * @namespace CONSTANTS
 * @description Uygulama genelinde kullanılan sabit değerler.
 */
const CONSTANTS = {
    /**
     * @memberof CONSTANTS
     * @type {Object}
     * @property {string[]} REQUIRED_HEADERS - Google Sheet'te bulunması gereken başlıklar.
     */
    API: {
        REQUIRED_HEADERS: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctAnswer', 'explanation']
    },
    /**
     * @memberof CONSTANTS
     * @type {Object}
     * @property {string} HIDDEN - 'hidden' CSS sınıfı.
     * @property {string} FLEX - 'flex' CSS sınıfı.
     * @property {string} MARKED - 'marked' CSS sınıfı.
     * @property {string} TAB_ACTIVE - 'tab-active' CSS sınıfı.
     * @property {string} OPTION_SELECTED - 'option-selected' CSS sınıfı.
     * @property {string} TIMER_WARNING - 'timer-warning' CSS sınıfı.
     */
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        FLEX: 'flex',
        MARKED: 'marked',
        TAB_ACTIVE: 'tab-active',
        OPTION_SELECTED: 'option-selected',
        TIMER_WARNING: 'timer-warning'
    },
    /**
     * @memberof CONSTANTS
     * @type {Object}
     * @property {string} APP_CONTAINER_ID - Uygulama konteynerinin ID'si.
     */
    DOM: {
        APP_CONTAINER_ID: 'app-container'
    }
};

/**
 * @class JusticeExamApp
 * @classdesc Sınav uygulamasının ana kontrolcüsüdür. Uygulama başlatıldığında:
 * 1. DOM elementlerini tanımlar.
 * 2. Google Sheet URL'sini alır.
 * 3. Soruları Google Sheet'ten çeker ve işler.
 * 4. Başarılı olursa ExamManager, UIManager ve ModalManager örneklerini oluşturur.
 * 5. UI'yi başlatır ve event listener'ları bağlar.
 */
class JusticeExamApp {
    /**
     * @constructor
     * @description Uygulamayı başlatır. DOM elementlerini tanımlar, yapılandırmayı yükler ve veri çekme işlemini başlatır.
     */
    constructor() {
        this.domElements = this._initializeDOMElements();
        if (!this.domElements.appContainer) {
            console.error(`Ana uygulama konteyneri (#${CONSTANTS.DOM.APP_CONTAINER_ID}) bulunamadı.`);
            return;
        }
        this.config = {
            sheetUrl: this.domElements.appContainer.dataset.sheetUrl,
            duration: this.domElements.appContainer.dataset.examDuration || null
        };
        this.examManager = null;
        this.uiManager = null;
        this.modalManager = null;
        this._fetchAndParseSheetData();
    }

    /**
     * @method _initializeDOMElements
     * @description HTML dosyasındaki gerekli DOM elementlerini bulur ve bir nesne olarak döndürür.
     * @returns {Object} DOM elementlerini içeren bir nesne.
     * @private
     */
    _initializeDOMElements() {
        const elementIds = [
            'app-container', 'welcome-screen', 'quiz-screen', 'start-exam-btn', 'elapsed-time', 'remaining-time',  
            'timer-announcer', 'question-counter', 'question-text', 'options-container', 'prev-btn', 'next-btn',  
            'mark-review-btn', 'finish-btn', 'nav-palette-container', 'result-modal', 'correct-count',  
            'incorrect-count', 'empty-count', 'success-rate', 'success-rate-box', 'success-text',  
            'performance-summary', 'wrong-answers-container', 'marked-questions-container', 'wrong-answers-tab',  
            'marked-questions-tab', 'wrong-answers-panel', 'marked-questions-panel', 'start-btn-full-text',  
            'total-question-count', 'total-duration-display', 'alert-modal', 'alert-modal-title',  
            'alert-modal-message', 'alert-modal-ok-btn', 'restart-btn', 'close-result-modal-btn',  
            'flag-outline-icon', 'flag-solid-icon'
        ];
        const elements = {};
        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            elements[camelCaseId] = document.getElementById(id);
        });
        return elements;
    }

    /**
     * @method _initializeApp
     * @description Google Sheet'ten çekilen sorularla uygulamayı başlatır.
     * ExamManager, UIManager ve ModalManager örneklerini oluşturur.
     * UI'yi günceller ve event listener'ları bağlar.
     * @param {Array} questionPool - Google Sheet'ten çekilen ve işlenen soru dizisi.
     * @private
     */
    _initializeApp(questionPool) {
        const examDuration = this.config.duration 
            ? parseInt(this.config.duration, 10) 
            : Math.ceil(questionPool.length * 1.2);
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = ` ${examDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;
        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);
        this._bindEventListeners();
    }

    /**
     * @method _bindEventListeners
     * @description UI'daki butonlar için event listener'ları bağlar.
     * @private
     */
    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => this.examManager.startExam());
        this.domElements.restartBtn?.addEventListener('click', () => window.location.reload());
        this.domElements.closeResultModalBtn?.addEventListener('click', () => window.location.reload());
        this.domElements.wrongAnswersTab?.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
        this.domElements.markedQuestionsTab?.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
    }

    /**
     * @method _fetchAndParseSheetData
     * @description Google Sheet'ten CSV verisini çeker ve işler.
     * @private
     */
    async _fetchAndParseSheetData() {
        try {
            if (!this.config.sheetUrl) throw new Error("Google Sheet linki bulunamadı.");
            const response = await fetch(this.config.sheetUrl);
            if (!response.ok) throw new Error(`Sorular Google Sheet'ten çekilemedi. Durum kodu: ${response.status}`);
            const csvText = await response.text();
            if (!csvText) { throw new Error("CSV verisi boş."); }
            
            const parsedRows = this._robustCsvParse(csvText);
            if (parsedRows.length < 2) throw new Error("CSV dosyasında yeterli veri yok.");

            const headers = parsedRows[0].map(h => h.trim());
            const questionPool = parsedRows.slice(1).map(rowArray => {
                const data = headers.reduce((obj, header, i) => ({ ...obj, [header]: (rowArray[i] || '').trim() }), {});
                return {
                    questionText: data.questionText,
                    options: { A: data.optionA, B: data.optionB, C: data.optionC, D: data.optionD, E: data.optionE || '' },
                    correctAnswer: (data.correctAnswer || '').trim().toUpperCase(),
                    explanation: data.explanation || ''
                };
            }).filter(q => q && q.questionText && q.correctAnswer);

            if (questionPool.length === 0) throw new Error("Google Sheet'te geçerli soru bulunamadı.");

            this._initializeApp(questionPool);
        } catch (error) {
            console.error('Veri çekme hatası:', error);
            if(this.domElements.startBtnFullText) this.domElements.startBtnFullText.textContent = 'HATA OLUŞTU';
            // Hata durumunda kullanıcıya bilgi ver
            if (this.domElements.welcomeScreen) {
                this.domElements.welcomeScreen.innerHTML = `
                    <div class="card p-8 text-center">
                        <h1 class="text-xl font-bold text-red-600">Sınav Başlatılamadı</h1>
                        <p class="mt-4 text-red-500">${error.message}</p>
                        <button onclick="window.location.reload()" class="mt-6 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                            Tekrar Dene
                        </button>
                    </div>
                `;
            }
        }
    }

    /**
     * @method _robustCsvParse
     * @description CSV metnini, çok satırlı hücreler ve kaçışlı tırnaklarla başa çıkabilecek şekilde satırlara ayırır.
     * @param {string} csvText - İşlenecek CSV metni.
     * @returns {Array<Array<string>>} Satırların dizisi, her satır kendi hücrelerinin dizisidir.
     * @private
     */
    _robustCsvParse(csvText) {
        const rows = []; let currentRow = []; let currentField = ''; let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i]; const nextChar = normalizedText[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') { currentField += '"'; i++; } 
                else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField); currentField = '';
            } else if (char === '\n' && !inQuotes) {
                currentRow.push(currentField);
                if (currentRow.some(field => field.trim() !== '')) rows.push(currentRow);
                currentRow = []; currentField = '';
            } else { currentField += char; }
        }
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) rows.push(currentRow);
        }
        return rows;
    }
}

/**
 * @class ExamManager
 * @classdesc Sınavın durumunu ve mantığını yönetir:
 * - Soruların listesi ve geçerli soru indeksi.
 * - Kullanıcının verdiği cevaplar ve işaretlemeler.
 * - Sınav süresi ve zamanlayıcı.
 * - Sorular arası geçiş, cevap seçimi, işaretleme gibi işlemleri yürütür.
 * - Sınav sonuçlarını hesaplar.
 */
class ExamManager {
    /**
     * @constructor
     * @param {Array} questions - Soru dizisi.
     * @param {number} durationMinutes - Sınav süresi (dakika).
     * @param {JusticeExamApp} app - Ana uygulama örneği.
     */
    constructor(questions, durationMinutes, app) { 
        this.questions = questions; 
        this.durationMinutes = durationMinutes; 
        this.app = app; 
        this.currentQuestionIndex = 0; 
        this.userAnswers = []; 
        this.timerInterval = null; 
        this.timeRemaining = 0; 
    }
    
    /**
     * @method startExam
     * @description Sınavı başlatır. Kullanıcı cevaplarını sıfırlar, zamanlayıcıyı başlatır, ilk soruyu render eder.
     */
    startExam() { 
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false })); 
        this.timeRemaining = this.durationMinutes * 60; 
        this.app.domElements.welcomeScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN); 
        this.app.domElements.quizScreen?.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN); 
        this.startTimer(); 
        this.app.uiManager.renderQuestion(); 
        this.app.uiManager.bindQuizEvents(); 
    }
    
    /**
     * @method formatTime
     * @description Saniye cinsinden süreyi HH:MM:SS formatına çevirir.
     * @param {number} seconds - Saniye cinsinden süre.
     * @returns {string} HH:MM:SS formatında zaman.
     */
    formatTime(seconds) { 
        const h = Math.floor(seconds / 3600); 
        const m = Math.floor((seconds % 3600) / 60); 
        const s = seconds % 60; 
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; 
    }
    
    /**
     * @method goToNextQuestion
     * @description Bir sonraki soruya geçer.
     */
    goToNextQuestion() { 
        if (this.currentQuestionIndex < this.questions.length - 1) { 
            this.currentQuestionIndex++; 
            this.app.uiManager.renderQuestion(); 
        } 
    }
    
    /**
     * @method goToPrevQuestion
     * @description Önceki soruya geçer.
     */
    goToPrevQuestion() { 
        if (this.currentQuestionIndex > 0) { 
            this.currentQuestionIndex--; 
            this.app.uiManager.renderQuestion(); 
        } 
    }
    
    /**
     * @method selectAnswer
     * @description Kullanıcının bir seçeneği seçmesini işler.
     * @param {string} optionKey - Seçilen seçeneğin anahtarı (A, B, C, D, E).
     */
    selectAnswer(optionKey) { 
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey; 
        this.app.uiManager.renderQuestion(); 
        if (this.currentQuestionIndex < this.questions.length - 1) { 
            setTimeout(() => this.goToNextQuestion(), 300); 
        } 
    }
    
    /**
     * @method toggleMarkForReview
     * @description Mevcut soruyu inceleme için işaretle/ışı kaldır.
     */
    toggleMarkForReview() { 
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview; 
        this.app.uiManager.updateNavPalette(); 
        this.app.uiManager.updateButtonStates(); 
    }
    
    /**
     * @method navigateToQuestion
     * @description Belirli bir soruya git.
     * @param {number} index - Gitmek istenen sorunun indeksi.
     */
    navigateToQuestion(index) { 
        if (index >= 0 && index < this.questions.length) { 
            this.currentQuestionIndex = index; 
            this.app.uiManager.renderQuestion(); 
        } 
    }
    
    /**
     * @method finishQuiz
     * @description Sınavı bitir. Otomatik bitirme (süre dolduğunda) veya kullanıcı onayı ile bitirme.
     * @param {boolean} isAuto - Sınav süresi dolduğunda otomatik bitiriliyorsa true.
     */
    finishQuiz(isAuto = false) { 
        if (!isAuto) { 
            this.app.modalManager.show({ 
                title: 'Sınavı Bitir', 
                message: 'Sınavı bitirmek istediğinizden emin misiniz?', 
                onConfirm: () => this.performFinish() 
            }); 
        } else { 
            this.performFinish(); 
        } 
    }
    
    /**
     * @method performFinish
     * @description Sınav sonuçlarını hesaplar ve sonuç sayfasını gösterir.
     */
    performFinish() { 
        if (this.timerInterval) clearInterval(this.timerInterval); 
        let correct = 0, incorrect = 0, empty = 0; 
        const incorrectQuestions = []; 
        const markedQuestions = []; 
        this.questions.forEach((q, i) => { 
            const userAnswerData = this.userAnswers[i]; 
            if (userAnswerData.isMarkedForReview) { 
                markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); 
            } 
            if (!userAnswerData.userAnswer) empty++; 
            else if (userAnswerData.userAnswer === q.correctAnswer) correct++; 
            else { 
                incorrect++; 
                incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); 
            } 
        }); 
        // Debugging: Sonuç dizilerinin içeriğini konsola yazdır
        console.log("PerformFinish - correct:", correct, "incorrect:", incorrect, "empty:", empty);
        console.log("PerformFinish - incorrectQuestions:", incorrectQuestions);
        console.log("PerformFinish - markedQuestions:", markedQuestions);
        
        this.app.uiManager.renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions); 
        this.app.domElements.quizScreen.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN); 
        this.app.domElements.resultModal.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN); 
    }
    
    /**
     * @method startTimer
     * @description Sınav zamanlayıcısını başlatır.
     */
    startTimer() {
        const totalDuration = this.durationMinutes * 60;
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) { 
                clearInterval(this.timerInterval); 
                this.finishQuiz(true); 
                return; 
            }
            this.timeRemaining--;
            if (this.app.domElements.remainingTime) this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            const elapsedSeconds = totalDuration - this.timeRemaining;
            if (this.app.domElements.elapsedTime) this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSeconds);
        }, 1000);
    }
}

/**
 * @class UIManager
 * @classdesc Kullanıcı arayüzü ile ilgili tüm işlemleri yönetir:
 * - Soru metni ve seçeneklerin ekrana çizilmesi.
 * - Soru gezgini kutularının güncellenmesi.
 * - Buton durumlarının (etkin/devre dışı) güncellenmesi.
 * - Sonuç sayfasının (yanlışlar, işaretlenenler) render edilmesi.
 * - UI event listener'larının bağlanması.
 */
class UIManager {
    /**
     * @constructor
     * @param {Object} domElements - JusticeExamApp tarafından sağlanan DOM elementleri.
     * @param {ExamManager} examManager - ExamManager örneği.
     */
    constructor(domElements, examManager) { 
        this.dom = domElements; 
        this.examManager = examManager; 
    }
    
    /**
     * @method renderQuestion
     * @description Mevcut soruyu ekrana çizer.
     */
    renderQuestion() { 
        const question = this.examManager.questions[this.examManager.currentQuestionIndex]; 
        if (this.dom.questionCounter) this.dom.questionCounter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`; 
        if (this.dom.questionText) this.dom.questionText.textContent = question.questionText.replace(/^\d+[\.\)-]\s*/, ''); 
        if (this.dom.optionsContainer) { 
            this.dom.optionsContainer.innerHTML = ''; 
            Object.entries(question.options).forEach(([key, optionText]) => { 
                if (optionText) this.dom.optionsContainer.appendChild(this._createOptionButton(key, optionText)); 
            }); 
        } 
        this.updateNavPalette(); 
        this.updateButtonStates(); 
    }
    
    /**
     * @method _createOptionButton
     * @description Bir seçenek butonu oluşturur.
     * @param {string} key - Seçeneğin anahtarı (A, B, C, D, E).
     * @param {string} optionText - Seçeneğin metni.
     * @returns {HTMLButtonElement} Oluşturulan buton elementi.
     * @private
     */
    _createOptionButton(key, optionText) { 
        const button = document.createElement('button'); 
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key; 
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg'; 
        button.innerHTML = `<span class="option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4">${key}</span><span class="text-justify w-full">${optionText}</span>`; 
        if (isSelected) button.classList.add(CONSTANTS.CSS_CLASSES.OPTION_SELECTED); 
        button.onclick = () => this.examManager.selectAnswer(key); 
        return button; 
    }
    
    /**
     * @method updateNavPalette
     * @description Soru gezgini kutularını günceller.
     */
    updateNavPalette() { 
        if (this.dom.navPaletteContainer) { 
            this.dom.navPaletteContainer.innerHTML = ''; 
            this.examManager.questions.forEach((_, index) => { 
                const box = document.createElement('button'); 
                box.textContent = index + 1; 
                let statusClass = 'bg-slate-300'; 
                const userAnswerData = this.examManager.userAnswers[index]; 
                if (userAnswerData.isMarkedForReview) { 
                    statusClass = 'bg-yellow-400 text-white'; 
                } else if (userAnswerData.userAnswer) { 
                    statusClass = 'bg-green-500 text-white'; 
                } 
                if (index === this.examManager.currentQuestionIndex) { 
                    box.classList.add('ring-4', 'ring-teal-500'); 
                } 
                box.className += ` nav-box w-full h-10 flex items-center justify-center rounded-md ${statusClass}`; 
                box.onclick = () => this.examManager.navigateToQuestion(index); 
                this.dom.navPaletteContainer.appendChild(box); 
            }); 
        } 
    }
    
    /**
     * @method updateButtonStates
     * @description UI'daki butonların (önceki, sonraki, bayrak) durumlarını günceller.
     */
    updateButtonStates() { 
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
            this.dom.markReviewBtn.classList.toggle(CONSTANTS.CSS_CLASSES.MARKED, isMarked);
        }
        if (this.dom.flagOutlineIcon) {
            this.dom.flagOutlineIcon.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, isMarked);
        }
        if (this.dom.flagSolidIcon) {
            this.dom.flagSolidIcon.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isMarked);
        }
    }
    
    /**
     * @method renderResultsPage
     * @description Sınav sonuç sayfasını render eder. Yanlış ve işaretlenen soruları gösterir.
     * @param {number} correct - Doğru cevap sayısı.
     * @param {number} incorrect - Yanlış cevap sayısı.
     * @param {number} empty - Boş bırakılan soru sayısı.
     * @param {Array} incorrectQuestions - Yanlış cevaplanan soruların dizisi.
     * @param {Array} markedQuestions - İşaretlenen soruların dizisi.
     */
    renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions) { 
        if (this.dom.correctCount) this.dom.correctCount.textContent = correct; 
        if (this.dom.incorrectCount) this.dom.incorrectCount.textContent = incorrect; 
        if (this.dom.emptyCount) this.dom.emptyCount.textContent = empty; 
        const total = this.examManager.questions.length; 
        if (this.dom.successRate) this.dom.successRate.textContent = `${(total > 0 ? (correct / total * 100) : 0).toFixed(1)}%`; 
        
        // Debugging: RenderResultsPage'e gelen verileri konsola yazdır
        console.log("RenderResultsPage - incorrectQuestions:", incorrectQuestions);
        console.log("RenderResultsPage - markedQuestions:", markedQuestions);
        
        // Yanlış cevaplar panelini doldur
        this._renderWrongAnswers(incorrectQuestions);
        // İşaretlenen sorular panelini doldur
        this._renderMarkedQuestions(markedQuestions);
    }
    
     /**
     * @method _renderWrongAnswers
     * @description Yanlış cevaplanan soruları sonuç panelinde gösterir.
     * @param {Array} incorrectQuestions - Yanlış cevaplanan soruların dizisi.
     * @private
     */
    _renderWrongAnswers(incorrectQuestions) {
        const container = this.dom.wrongAnswersContainer;
        if (!container) {
            console.error("Yanlış cevaplar container'i bulunamadı.");
            return; 
        }
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

    /**
     * @method _renderMarkedQuestions
     * @description İşaretlenen soruları sonuç panelinde gösterir.
     * @param {Array} markedQuestions - İşaretlenen soruların dizisi.
     * @private
     */
    _renderMarkedQuestions(markedQuestions) {
        const container = this.dom.markedQuestionsContainer;
        if (!container) {
            console.error("İşaretlenen sorular container'i bulunamadı.");
            return;
        }
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
    
    /**
     * @method _createResultOptionsHTML
     * @description Sonuç sayfası için seçenekleri HTML olarak oluşturur (doğru/yanlış vurguları ile).
     * @param {Object} q - Soru objesi.
     * @param {string} userAnswer - Kullanıcının verdiği cevap.
     * @returns {string} Oluşturulan HTML string'i.
     * @private
     */
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
    
    /**
     * @method switchResultTab
     * @description Sonuç sayfasındaki sekmeler (Yanlışlar, İşaretlenenler) arasında geçiş yapar.
     * @param {string} tabName - Geçilecek sekmenin adı ('wrong' veya 'marked').
     */
    switchResultTab(tabName) { 
        if (!this.dom.wrongAnswersPanel || !this.dom.markedQuestionsPanel) return; 
        const isWrongTab = tabName === 'wrong'; 
        this.dom.wrongAnswersPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isWrongTab); 
        this.dom.markedQuestionsPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, isWrongTab); 
        this.dom.wrongAnswersTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, isWrongTab); 
        this.dom.markedQuestionsTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, !isWrongTab); 
    }
    
    /**
     * @method bindQuizEvents
     * @description Sınav ekranındaki butonlara event listener bağlar.
     */
    bindQuizEvents() { 
        this.dom.nextBtn?.addEventListener('click', () => this.examManager.goToNextQuestion()); 
        this.dom.prevBtn?.addEventListener('click', () => this.examManager.goToPrevQuestion()); 
        this.dom.markReviewBtn?.addEventListener('click', () => this.examManager.toggleMarkForReview()); 
        this.dom.finishBtn?.addEventListener('click', () => this.examManager.finishQuiz(false)); 
    }
}

/**
 * @class ModalManager
 * @classdesc Modal pencereleri (uyarı, sonuç) ile ilgili işlemleri yönetir:
 * - Modal'ı gösterme ve gizleme.
 * - Modal içeriğini (başlık, mesaj) güncelleme.
 * - Modal'daki butonlara tıklama event'lerini yönetme.
 */
class ModalManager {
    /**
     * @constructor
     * @param {Object} domElements - JusticeExamApp tarafından sağlanan DOM elementleri.
     */
    constructor(domElements) { 
        this.dom = domElements; 
        this._bindModalEvents(); 
    }
    
    /**
     * @method _bindModalEvents
     * @description Modal ile ilgili event listener'ları bağlar.
     * @private
     */
    _bindModalEvents() { 
        this.dom.alertModalOkBtn?.addEventListener('click', () => this.hide()); 
    }
    
    /**
     * @method show
     * @description Alert modal'ı gösterir.
     * @param {Object} config - Modal yapılandırması.
     * @param {string} config.title - Modal başlığı.
     * @param {string} config.message - Modal mesajı.
     * @param {Function} [config.onConfirm] - Kullanıcı "Tamam" butonuna tıkladığında çalışacak fonksiyon.
     */
    show(config) {
        const { alertModal, alertModalTitle, alertModalMessage, alertModalOkBtn } = this.dom;
        if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) {
            console.error("Alert modal elementlerinden biri bulunamadı.");
            return;
        }
        alertModalTitle.textContent = config.title;
        alertModalMessage.textContent = config.message;
        alertModal.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        alertModal.classList.add(CONSTANTS.CSS_CLASSES.FLEX);
        alertModalOkBtn.focus();
        alertModalOkBtn.onclick = () => { 
            this.hide(); 
            if (config.onConfirm) config.onConfirm(); 
        };
    }
    
    /**
     * @method hide
     * @description Alert modal'ı gizler.
     */
    hide() { 
        if (this.dom.alertModal) { 
            this.dom.alertModal.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN); 
            this.dom.alertModal.classList.remove(CONSTANTS.CSS_CLASSES.FLEX); 
        } 
    }
}

// --- NİHAİ BAŞLATMA KODU: ZAMANLAMA SORUNUNU ÇÖZEN YAPI ---
/**
 * @event document#template-loaded
 * @description template-loader.js tarafından şablon yüklendiğinde tetiklenir.
 * Bu event, sınav motorunun başlatılmasının güvenli bir şekilde yapılmasını sağlar.
 */
document.addEventListener('template-loaded', () => {
    if (document.getElementById(CONSTANTS.DOM.APP_CONTAINER_ID)) {
        // Tarayıcıya DOM'un güncellenmesi için bir anlık süre tanı.
        setTimeout(() => {
            new JusticeExamApp();
        }, 0);
    }
});
