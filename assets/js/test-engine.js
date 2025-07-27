/**
 * @file Adalet GYS Portalı için ana sınav motoru ve uygulama mantığı.
 * @description Bu dosya, Google Sheet'ten sınav verilerini çeken, sınavı yöneten (zamanlayıcı, soru geçişleri),
 * kullanıcı arayüzünü güncelleyen ve sonuçları gösteren tüm sınıfları içerir.
 * @version 2.1.0 (Flexible Duration & Professional Refactoring)
 */

const CONSTANTS = {
    API: {
        REQUIRED_HEADERS: ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'optionE', 'correctAnswer', 'explanation']
    },
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        FLEX: 'flex',
        MARKED: 'marked',
        TAB_ACTIVE: 'tab-active',
        OPTION_SELECTED: 'option-selected',
        TIMER_WARNING: 'timer-warning'
    },
    EXAM: {
        DEFAULT_MINUTES_PER_QUESTION: 1.2, // data-exam-duration yoksa varsayılan süre (soru başına)
        TIMER_WARNING_SECONDS: 300,        // Son 5 dakika uyarısı (saniye)
        AUTO_NEXT_QUESTION_DELAY: 300      // Cevap sonrası otomatik geçiş gecikmesi (ms)
    },
    DOM: {
        APP_CONTAINER_ID: 'app-container'
    }
};

/**
 * Ana uygulama sınıfı. Tüm modülleri başlatır ve veri akışını yönetir.
 * @class JusticeExamApp
 */
class JusticeExamApp {
    constructor() {
        this.domElements = this._initializeDOMElements();
        if (!this.domElements.appContainer) {
            console.error(`Ana uygulama konteyneri (#${CONSTANTS.DOM.APP_CONTAINER_ID}) bulunamadı. Sınav motoru başlatılmadı.`);
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
     * DOM'daki tüm gerekli element referanslarını tek seferde alır ve saklar.
     * @private
     * @returns {Object<string, HTMLElement>} Element referanslarını içeren bir obje.
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
            'flag-outline-icon', 'flag-solid-icon', 'warning-box', 'warning-message'
        ];
        const elements = {};
        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            elements[camelCaseId] = document.getElementById(id);
        });
        return elements;
    }

    /**
     * Veri çekme başarılı olduktan sonra uygulamayı ve modülleri başlatır.
     * @private
     * @param {Array<Object>} questionPool - Soru objelerini içeren dizi.
     */
    _initializeApp(questionPool) {
        if (!Array.isArray(questionPool) || questionPool.length === 0) {
            this._showError("Google Sheet'ten soru verisi alınamadı veya format hatalı.");
            return;
        }

        // DİNAMİK SÜRE HESAPLAMA
        const examDuration = this.config.duration 
            ? parseInt(this.config.duration, 10) 
            : Math.ceil(questionPool.length * CONSTANTS.EXAM.DEFAULT_MINUTES_PER_QUESTION);

        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = ` ${examDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;

        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);

        this._bindEventListeners();
    }
    
    /**
     * Kullanıcı arayüzünde bir hata mesajı gösterir.
     * @private
     * @param {string} message - Gösterilecek hata mesajı.
     */
    _showError(message) {
        const { startExamBtn, startBtnFullText, totalQuestionCount, warningBox, warningMessage } = this.domElements;
        if (startExamBtn) startExamBtn.disabled = true;
        if (startBtnFullText) startBtnFullText.textContent = "HATA OLUŞTU";
        if (totalQuestionCount) totalQuestionCount.textContent = "0";
        if (warningMessage) warningMessage.textContent = message;
        if (warningBox) warningBox.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        console.error("Uygulama Hatası:", message);
    }
    
    /**
     * Uygulamanın ana event listener'larını bağlar.
     * @private
     */
    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => this.startExam());
        
        // YENİ KÖK-GÖRECELİ YOL
        this.domElements.restartBtn?.addEventListener('click', () => window.location.href = '/adalet-gys-portal/index.html');
        this.domElements.closeResultModalBtn?.addEventListener('click', () => window.location.href = '/adalet-gys-portal/index.html');

        if (this.domElements.wrongAnswersTab && this.domElements.markedQuestionsTab && this.uiManager) {
            this.domElements.wrongAnswersTab.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
            this.domElements.markedQuestionsTab.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
        }
    }

    /**
     * Sınavı başlatır.
     */
    startExam() {
        this.domElements.welcomeScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.examManager?.startExam();
    }

    /**
     * Google Sheet'ten CSV verisini çeker, işler ve uygulamayı başlatır.
     * @private
     */
    async _fetchAndParseSheetData() {
        if (!this.config.sheetUrl) {
            this._showError("Google Sheet linki (data-sheet-url) bulunamadı.");
            return;
        }
        try {
            const response = await fetch(this.config.sheetUrl);
            if (!response.ok) throw new Error(`Ağ yanıtı başarısız: ${response.statusText}`);
            const csvText = await response.text();
            if (!csvText) throw new Error("CSV verisi boş.");

            const parsedRows = this._robustCsvParse(csvText);
            if (parsedRows.length < 2) throw new Error("CSV dosyasında yeterli veri yok.");

            const headers = parsedRows[0].map(h => h.trim());
            const missingHeaders = CONSTANTS.API.REQUIRED_HEADERS.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) throw new Error(`Eksik başlıklar: ${missingHeaders.join(', ')}`);

            const questionPool = parsedRows.slice(1).map(rowArray => {
                if (rowArray.every(field => field.trim() === '')) return null;
                const data = headers.reduce((obj, header, i) => {
                    obj[header] = rowArray[i] || '';
                    return obj;
                }, {});
                return {
                    questionText: data.questionText,
                    options: { A: data.optionA, B: data.optionB, C: data.optionC, D: data.optionD, E: data.optionE || '' },
                    correctAnswer: data.correctAnswer.trim().toUpperCase(),
                    explanation: data.explanation || ''
                };
            }).filter(q => q && q.questionText && q.correctAnswer);

            if (questionPool.length === 0) throw new Error("Hiç geçerli soru bulunamadı.");
            this._initializeApp(questionPool);

        } catch (error) {
            console.error('Veri çekme hatası:', error);
            this._showError(`Sorular çekilirken hata oluştu: ${error.message}`);
        }
    }

    /**
     * Tırnak içindeki yeni satır ve virgül karakterlerini koruyarak CSV metnini satırlara ayırır.
     * @private
     * @param {string} csvText - İşlenecek ham CSV metni.
     * @returns {Array<Array<string>>} Her biri sütun dizisi olan satırların dizisi.
     */
    _robustCsvParse(csvText) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            const nextChar = normalizedText[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') { currentField += '"'; i++; } 
                else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField); currentField = '';
            } else if (char === '\n' && !inQuotes) {
                currentRow.push(currentField);
                if (currentRow.some(field => field.trim() !== '')) rows.push(currentRow);
                currentRow = []; currentField = '';
            } else {
                currentField += char;
            }
        }
        if (currentField !== '' || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) rows.push(currentRow);
        }
        return rows;
    }
}

/**
 * Sınavın durumunu (mevcut soru, cevaplar, zaman) yönetir.
 * @class ExamManager
 */
class ExamManager {
    constructor(questions, durationMinutes, app) {
        this.questions = questions;
        this.durationMinutes = durationMinutes;
        this.app = app;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.handleVisibilityChange = () => {
            if (document.hidden && this.app.modalManager) {
                this.app.modalManager.show({
                    title: 'UYARI',
                    message: 'Sınav sırasında başka bir sekmeye geçtiniz. Lütfen sınava odaklanın.'
                });
            }
        };
    }

    startExam() {
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false }));
        this.timeRemaining = this.durationMinutes * 60;
        this.app.domElements.quizScreen?.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.startTimer();
        if (this.app.uiManager) {
            this.app.uiManager.renderQuestion();
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
            this.app.uiManager?.renderQuestion();
        }
    }

    goToPrevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.app.uiManager?.renderQuestion();
        }
    }

    selectAnswer(optionKey) {
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        this.app.uiManager?.renderQuestion();
        if (this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => this.goToNextQuestion(), CONSTANTS.EXAM.AUTO_NEXT_QUESTION_DELAY);
        }
    }

    toggleMarkForReview() {
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        this.app.uiManager?.updateNavPalette();
        this.app.uiManager?.updateButtonStates();
    }

    navigateToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index;
            this.app.uiManager?.renderQuestion();
        }
    }

    finishQuiz(isAuto = false) {
        if (isAuto) {
            this.performFinish();
        } else {
            this.app.modalManager?.show({
                title: 'Sınavı Bitir',
                message: 'Sınavı bitirmek istediğinizden emin misiniz?',
                onConfirm: () => this.performFinish()
            });
        }
    }

    performFinish() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        let correct = 0, incorrect = 0, empty = 0;
        const incorrectQuestions = [], markedQuestions = [];

        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];
            if (userAnswerData.isMarkedForReview) markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer });
            if (!userAnswerData.userAnswer) empty++;
            else if (userAnswerData.userAnswer === q.correctAnswer) correct++;
            else {
                incorrect++;
                incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer });
            }
        });

        const totalQuestions = this.questions.length;
        const successPercentage = totalQuestions > 0 ? (correct / totalQuestions * 100) : 0;

        if (this.app.domElements.correctCount) this.app.domElements.correctCount.textContent = correct;
        if (this.app.domElements.incorrectCount) this.app.domElements.incorrectCount.textContent = incorrect;
        if (this.app.domElements.emptyCount) this.app.domElements.emptyCount.textContent = empty;
        if (this.app.domElements.successRate) this.app.domElements.successRate.textContent = `${successPercentage.toFixed(1)}%`;

        this.app.uiManager?.updateSuccessRateAppearance(successPercentage);
        this.app.domElements.quizScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        if (this.app.domElements.resultModal) {
            this.app.domElements.resultModal.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
            this.app.domElements.resultModal.focus();
        }
        this.app.uiManager?.renderResultsPage(incorrectQuestions, markedQuestions);
    }

    startTimer() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        const totalDuration = this.durationMinutes * 60;
        if (this.app.domElements.remainingTime) this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
        if (this.app.domElements.elapsedTime) this.app.domElements.elapsedTime.textContent = this.formatTime(0);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.app.domElements.remainingTime?.classList.remove(CONSTANTS.CSS_CLASSES.TIMER_WARNING);

        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.finishQuiz(true);
                return;
            }
            this.timeRemaining--;
            if (this.app.domElements.remainingTime) this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            const elapsedSecondsTotal = totalDuration - this.timeRemaining;
            if (this.app.domElements.elapsedTime) this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSecondsTotal);
            
            if (this.timeRemaining <= CONSTANTS.EXAM.TIMER_WARNING_SECONDS && !this.app.domElements.remainingTime.classList.contains(CONSTANTS.CSS_CLASSES.TIMER_WARNING)) {
                this.app.domElements.remainingTime.classList.add(CONSTANTS.CSS_CLASSES.TIMER_WARNING);
                if (this.app.domElements.timerAnnouncer) this.app.domElements.timerAnnouncer.textContent = `Sınavın bitmesine son ${Math.floor(CONSTANTS.EXAM.TIMER_WARNING_SECONDS/60)} dakika kaldı.`;
            }
        }, 1000);
    }
}

/**
 * Kullanıcı arayüzü (UI) ile ilgili tüm DOM manipülasyonlarını yönetir.
 * @class UIManager
 */
class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements;
        this.examManager = examManager;
    }

    renderQuestion() {
        const question = this.examManager.questions[this.examManager.currentQuestionIndex];
        if (this.dom.counter) this.dom.counter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`;
        if (this.dom.questionText) {
            const cleanQuestionText = question.questionText.replace(/^\d+[\.\)-]\s*/, '');
            this.dom.questionText.textContent = cleanQuestionText;
        }

        if (this.dom.optionsContainer) {
            this.dom.optionsContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();
            Object.entries(question.options).forEach(([key, optionText]) => {
                if (optionText) {
                    const button = this._createOptionButton(key, optionText);
                    fragment.appendChild(button);
                }
            });
            this.dom.optionsContainer.appendChild(fragment);
        }

        this.updateNavPalette();
        this.updateButtonStates();
    }

    _createOptionButton(key, optionText) {
        const button = document.createElement('button');
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key;
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', isSelected);

        const optionKeySpan = document.createElement('span');
        optionKeySpan.className = 'option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4';
        optionKeySpan.textContent = key;
        const optionTextSpan = document.createElement('span');
        optionTextSpan.className = 'text-justify w-full';
        optionTextSpan.textContent = optionText;
        button.append(optionKeySpan, optionTextSpan);

        if (isSelected) button.classList.add(CONSTANTS.CSS_CLASSES.OPTION_SELECTED);
        button.onclick = () => this.examManager.selectAnswer(key);
        return button;
    }

    updateNavPalette() {
        if (this.dom.navPalette) {
            this.dom.navPalette.innerHTML = '';
            const fragment = document.createDocumentFragment();
            this.examManager.questions.forEach((_, index) => {
                const box = document.createElement('button');
                box.textContent = index + 1;
                box.setAttribute('aria-label', `Soru ${index + 1}'ye git`);
                
                let statusClass = ' bg-slate-300 hover:bg-slate-400';
                const userAnswerData = this.examManager.userAnswers[index];
                if (userAnswerData.isMarkedForReview) statusClass = ' bg-yellow-400 text-white hover:bg-yellow-500';
                else if (userAnswerData.userAnswer) statusClass = ' bg-green-500 text-white hover:bg-green-600';
                
                let ringClass = index === this.examManager.currentQuestionIndex ? ' ring-4 ring-offset-2 ring-teal-500 scale-110 z-10' : '';
                box.className = `nav-box w-full h-10 flex items-center justify-center rounded-md border border-transparent${statusClass}${ringClass}`;
                box.onclick = () => this.examManager.navigateToQuestion(index);
                fragment.appendChild(box);
            });
            this.dom.navPalette.appendChild(fragment);
        }
    }

    updateButtonStates() {
        this.dom.prevBtn.disabled = this.examManager.currentQuestionIndex === 0;
        this.dom.nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1;

        const isMarked = this.examManager.userAnswers[this.examManager.currentQuestionIndex].isMarkedForReview;
        this.dom.markReviewBtn?.classList.toggle(CONSTANTS.CSS_CLASSES.MARKED, isMarked);
        this.dom.flagOutlineIcon?.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, isMarked);
        this.dom.flagSolidIcon?.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isMarked);
    }
    
    renderResultsPage(incorrectQuestions, markedQuestions) {
        this._renderResultItems(this.dom.wrongAnswersContainer, incorrectQuestions, 'wrong');
        this._renderResultItems(this.dom.markedQuestionsContainer, markedQuestions, 'marked');
    }

    _renderResultItems(container, items, type) {
        if (!container) return;
        container.innerHTML = '';
        if (items.length === 0) {
            const message = type === 'wrong' ? 'Tebrikler! Yanlış cevabınız bulunmuyor.' : 'İncelemek için herhangi bir soru işaretlemediniz.';
            const messageClass = type === 'wrong' ? 'text-green-600 bg-green-50' : 'text-slate-600 bg-slate-50';
            container.innerHTML = `<p class="${messageClass} p-4 rounded-lg">${message}</p>`;
            return;
        }
        items.forEach((item) => {
            const { question: q, index, userAnswer } = item;
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200";
            const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');
            
            let explanationHTML = '';
            if (q.explanation) {
                const separator = "Hafıza Tekniği:";
                const separatorIndex = q.explanation.indexOf(separator);
                const konuOzeti = separatorIndex !== -1 ? q.explanation.substring(0, separatorIndex).replace("Konu Özeti:", "").trim() : q.explanation.replace("Konu Özeti:", "").trim();
                const hafizaTeknigi = separatorIndex !== -1 ? q.explanation.substring(separatorIndex + separator.length).trim() : "";
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4>`;
                if(konuOzeti) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`;
                if(hafizaTeknigi) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`;
                explanationHTML += `</div>`;
            }

            let headerHTML = `<p class="font-bold mb-2">Soru ${index + 1}:</p>`;
            if(type === 'marked') {
                const isCorrect = userAnswer === q.correctAnswer;
                const statusText = userAnswer ? (isCorrect ? 'Doğru Cevaplandı' : 'Yanlış Cevaplandı') : 'Boş Bırakıldı';
                const statusColor = userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-slate-600';
                headerHTML = `<div class="flex justify-between items-center mb-2"><p class="font-bold">Soru ${index + 1}:</p><span class="text-sm font-semibold ${statusColor}">${statusText}</span></div>`;
            }

            resultItemDiv.innerHTML = `${headerHTML}<pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>${this._createResultOptionsHTML(q, userAnswer)}${explanationHTML}`;
            container.appendChild(resultItemDiv);
        });
    }

    _createResultOptionsHTML(q, userAnswer) {
        let optionsHTML = '<div class="space-y-2 mt-4 text-sm">';
        Object.entries(q.options).forEach(([key, text]) => {
            if (!text) return;
            let classes = 'border-slate-200 bg-slate-50 text-slate-700';
            let icon = `<span class="font-bold text-slate-500">${key})</span>`;
            if (key === q.correctAnswer) {
                classes = 'border-green-400 bg-green-50 text-green-800 font-medium';
                icon = `<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            } else if (key === userAnswer) {
                classes = 'border-red-400 bg-red-50 text-red-800 font-medium';
                icon = `<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            }
            optionsHTML += `<div class="flex items-start p-3 rounded-lg border ${classes}"><div class="flex-shrink-0 w-5 h-5 mr-3">${icon}</div><p class="text-justify flex-1">${text}</p></div>`;
        });
        return optionsHTML + '</div>';
    }

    updateSuccessRateAppearance(percentage) {
        const { successRateBox: box, successText: text, performanceSummary: summary } = this.dom;
        if (!box || !text || !summary) return;
        box.className = 'p-4 rounded-lg'; text.className = '';
        let message = "Konuları tekrar gözden geçirmende fayda var. Pes etme!", boxClass = 'bg-red-100', textClass = 'text-red-800';
        if (percentage >= 90) { message = "Mükemmel! Konulara tamamen hakimsin."; boxClass = 'bg-green-100'; textClass = 'text-green-800'; }
        else if (percentage >= 70) { message = "Harika bir sonuç! Başarın göz dolduruyor."; boxClass = 'bg-green-100'; textClass = 'text-green-800'; }
        else if (percentage >= 50) { message = "İyi bir başlangıç. Yanlış yaptığın konuları tekrar etmen faydalı olacaktır."; boxClass = 'bg-yellow-100'; textClass = 'text-yellow-800'; }
        box.classList.add(boxClass); text.classList.add(textClass);
        summary.textContent = message; text.textContent = 'Başarı';
    }
    
    switchResultTab(tabName) {
        const { wrongAnswersPanel, markedQuestionsPanel, wrongAnswersTab, markedQuestionsTab } = this.dom;
        if (!wrongAnswersPanel || !markedQuestionsPanel || !wrongAnswersTab || !markedQuestionsTab) return;
        const isWrongTab = tabName === 'wrong';
        wrongAnswersPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isWrongTab);
        markedQuestionsPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, isWrongTab);
        wrongAnswersTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, isWrongTab);
        markedQuestionsTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, !isWrongTab);
    }
    
    bindQuizEvents() {
        this.dom.nextBtn?.addEventListener('click', () => this.examManager.goToNextQuestion());
        this.dom.prevBtn?.addEventListener('click', () => this.examManager.goToPrevQuestion());
        this.dom.markReviewBtn?.addEventListener('click', () => this.examManager.toggleMarkForReview());
        this.dom.finishBtn?.addEventListener('click', () => this.examManager.finishQuiz(false));
    }
}

/**
 * Onay ve uyarı pencerelerini (modallar) yönetir.
 * @class ModalManager
 */
class ModalManager {
    constructor(domElements) {
        this.dom = domElements;
        this._bindModalEvents();
    }
    
    _bindModalEvents() {
        this.dom.alertModalOkBtn?.addEventListener('click', () => this.hide());
    }
    
    show(config) {
        const { alertModal, alertModalTitle, alertModalMessage, alertModalOkBtn } = this.dom;
        if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) return;
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
    
    hide() {
        if (this.dom.alertModal) {
            this.dom.alertModal.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
            this.dom.alertModal.classList.remove(CONSTANTS.CSS_CLASSES.FLEX);
        }
    }
}

// --- UYGULAMAYI BAŞLATMA ---
// Şablonun yüklendiğine dair 'template-loaded' olayını dinle.
// Bu olay, template-loader.js tarafından tetiklenir.
document.addEventListener('template-loaded', () => {
    // Sadece sınav motoruna ihtiyaç duyan sayfalarda başlat.
    if (document.getElementById(CONSTANTS.DOM.APP_CONTAINER_ID)) {
        new JusticeExamApp();
    }
});
