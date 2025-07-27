/**
 * @file Adalet GYS Portalı için ana sınav motoru ve uygulama mantığı.
 * @description Bu dosya, Google Sheet'ten sınav verilerini çeken, sınavı yöneten (zamanlayıcı, soru geçişleri),
 * kullanıcı arayüzünü güncelleyen ve sonuçları gösteren tüm sınıfları içerir.
 * @version 3.0 (Final Sync)
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
        DEFAULT_MINUTES_PER_QUESTION: 1.2,
        TIMER_WARNING_SECONDS: 300,
        AUTO_NEXT_QUESTION_DELAY: 300
    },
    DOM: {
        APP_CONTAINER_ID: 'app-container'
    }
};

class JusticeExamApp {
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

    _initializeApp(questionPool) {
        if (!Array.isArray(questionPool) || questionPool.length === 0) {
            this._showError("Google Sheet'ten soru verisi alınamadı veya format hatalı.");
            return;
        }
        const examDuration = this.config.duration 
            ? parseInt(this.config.duration, 10) 
            : Math.ceil(questionPool.length * CONSTANTS.EXAM.DEFAULT_MINUTES_PER_QUESTION);

        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = ` ${examDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;

        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);

        this._bindEventListeners();
    }
    
    _showError(message) {
        const { startExamBtn, startBtnFullText, totalQuestionCount, warningBox, warningMessage } = this.domElements;
        if (startExamBtn) startExamBtn.disabled = true;
        if (startBtnFullText) startBtnFullText.textContent = "HATA OLUŞTU";
        if (totalQuestionCount) totalQuestionCount.textContent = "0";
        if (warningMessage) warningMessage.textContent = message;
        if (warningBox) warningBox.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        console.error("Uygulama Hatası:", message);
    }
    
    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => this.startExam());
        this.domElements.restartBtn?.addEventListener('click', () => window.location.href = '/adalet-gys-portal/index.html');
        this.domElements.closeResultModalBtn?.addEventListener('click', () => window.location.href = '/adalet-gys-portal/index.html');

        if (this.domElements.wrongAnswersTab && this.domElements.markedQuestionsTab && this.uiManager) {
            this.domElements.wrongAnswersTab.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
            this.domElements.markedQuestionsTab.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
        }
    }

    startExam() {
        this.domElements.welcomeScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.examManager?.startExam();
    }

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
            const headers = parsedRows[0].map(h => h.trim());
            const questionPool = parsedRows.slice(1).map(rowArray => {
                const data = headers.reduce((obj, header, i) => ({ ...obj, [header]: rowArray[i] || '' }), {});
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

    _robustCsvParse(csvText) {
        const rows = []; let currentRow = []; let currentField = ''; let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { currentRow.push(currentField); currentField = ''; }
            else if (char === '\n' && !inQuotes) {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = []; currentField = '';
            } else { currentField += char; }
        }
        currentRow.push(currentField); rows.push(currentRow);
        return rows;
    }
}

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
                    title: 'UYARI', message: 'Sınav sırasında başka bir sekmeye geçtiniz. Lütfen sınava odaklanın.'
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
            this.currentQuestionIndex++; this.app.uiManager?.renderQuestion();
        }
    }
    goToPrevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--; this.app.uiManager?.renderQuestion();
        }
    }
    selectAnswer(optionKey) {
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        this.app.uiManager?.renderQuestion();
        setTimeout(() => this.goToNextQuestion(), CONSTANTS.EXAM.AUTO_NEXT_QUESTION_DELAY);
    }
    toggleMarkForReview() {
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        this.app.uiManager?.updateNavPalette();
        this.app.uiManager?.updateButtonStates();
    }
    navigateToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentQuestionIndex = index; this.app.uiManager?.renderQuestion();
        }
    }
    finishQuiz(isAuto = false) {
        if (isAuto) { this.performFinish(); }
        else {
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
            else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
        });
        const successPercentage = this.questions.length > 0 ? (correct / this.questions.length * 100) : 0;
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
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval); this.finishQuiz(true); return;
            }
            this.timeRemaining--;
            if (this.app.domElements.remainingTime) this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            const elapsedSeconds = totalDuration - this.timeRemaining;
            if (this.app.domElements.elapsedTime) this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSeconds);
            if (this.timeRemaining <= CONSTANTS.EXAM.TIMER_WARNING_SECONDS && !this.app.domElements.remainingTime.classList.contains(CONSTANTS.CSS_CLASSES.TIMER_WARNING)) {
                this.app.domElements.remainingTime.classList.add(CONSTANTS.CSS_CLASSES.TIMER_WARNING);
            }
        }, 1000);
    }
}

class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements; this.examManager = examManager;
    }
    renderQuestion() {
        const question = this.examManager.questions[this.examManager.currentQuestionIndex];
        if (this.dom.questionCounter) this.dom.questionCounter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`;
        if (this.dom.questionText) this.dom.questionText.textContent = question.questionText.replace(/^\d+[\.\)-]\s*/, '');
        if (this.dom.optionsContainer) {
            this.dom.optionsContainer.innerHTML = '';
            const fragment = document.createDocumentFragment();
            Object.entries(question.options).forEach(([key, optionText]) => {
                if (optionText) { fragment.appendChild(this._createOptionButton(key, optionText)); }
            });
            this.dom.optionsContainer.appendChild(fragment);
        }
        this.updateNavPalette(); this.updateButtonStates();
    }
    _createOptionButton(key, optionText) {
        const button = document.createElement('button');
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key;
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg';
        button.innerHTML = `<span class="option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4">${key}</span><span class="text-justify w-full">${optionText}</span>`;
        if (isSelected) button.classList.add(CONSTANTS.CSS_CLASSES.OPTION_SELECTED);
        button.onclick = () => this.examManager.selectAnswer(key);
        return button;
    }
    updateNavPalette() {
        if (this.dom.navPaletteContainer) {
            this.dom.navPaletteContainer.innerHTML = '';
            this.examManager.questions.forEach((_, index) => {
                const box = document.createElement('button');
                box.textContent = index + 1;
                let statusClass = 'bg-slate-300 hover:bg-slate-400';
                const userAnswerData = this.examManager.userAnswers[index];
                if (userAnswerData.isMarkedForReview) statusClass = 'bg-yellow-400 text-white hover:bg-yellow-500';
                else if (userAnswerData.userAnswer) statusClass = 'bg-green-500 text-white hover:bg-green-600';
                let ringClass = index === this.examManager.currentQuestionIndex ? ' ring-4 ring-offset-2 ring-teal-500' : '';
                box.className = `nav-box w-full h-10 flex items-center justify-center rounded-md border ${statusClass}${ringClass}`;
                box.onclick = () => this.examManager.navigateToQuestion(index);
                this.dom.navPaletteContainer.appendChild(box);
            });
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
            container.innerHTML = `<p class="p-4 rounded-lg">${type === 'wrong' ? 'Tebrikler! Yanlış cevabınız bulunmuyor.' : 'İncelemek için herhangi bir soru işaretlemediniz.'}</p>`;
            return;
        }
        items.forEach(({ question: q, index, userAnswer }) => {
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border";
            resultItemDiv.innerHTML = `<p class="font-bold mb-2">Soru ${index + 1}:</p><pre class="mb-4 bg-slate-50 p-3 rounded">${q.questionText.replace(/^\d+[\.\)-]\s*/, '')}</pre>${this._createResultOptionsHTML(q, userAnswer)}${q.explanation ? `<div class="explanation-box mt-4"><h4>Soru Analizi</h4><p>${q.explanation}</p></div>` : ''}`;
            container.appendChild(resultItemDiv);
        });
    }
    _createResultOptionsHTML(q, userAnswer) {
        let optionsHTML = '<div class="space-y-2 mt-4 text-sm">';
        Object.entries(q.options).forEach(([key, text]) => {
            if (!text) return;
            let classes = 'border-slate-200 bg-slate-50'; let icon = `<strong>${key})</strong>`;
            if (key === q.correctAnswer) { classes = 'border-green-400 bg-green-50'; icon = '✓'; }
            else if (key === userAnswer) { classes = 'border-red-400 bg-red-50'; icon = '✗'; }
            optionsHTML += `<div class="flex items-start p-3 rounded-lg border ${classes}">${icon} <p class="ml-3">${text}</p></div>`;
        });
        return optionsHTML + '</div>';
    }
    updateSuccessRateAppearance(percentage) {
        const { successRateBox: box, successText: text, performanceSummary: summary } = this.dom;
        if (!box || !text || !summary) return;
        let message = "Tekrar etmelisin.", boxClass = 'bg-red-100', textClass = 'text-red-800';
        if (percentage >= 70) { message = "Harika sonuç!"; boxClass = 'bg-green-100'; textClass = 'text-green-800'; }
        else if (percentage >= 50) { message = "İyi iş."; boxClass = 'bg-yellow-100'; textClass = 'text-yellow-800'; }
        box.className = `p-4 rounded-lg ${boxClass}`; text.className = textClass;
        summary.textContent = message;
    }
    switchResultTab(tabName) {
        const { wrongAnswersPanel, markedQuestionsPanel, wrongAnswersTab, markedQuestionsTab } = this.dom;
        if (!wrongAnswersPanel || !markedQuestionsPanel) return;
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

class ModalManager {
    constructor(domElements) { this.dom = domElements; this._bindModalEvents(); }
    _bindModalEvents() { this.dom.alertModalOkBtn?.addEventListener('click', () => this.hide()); }
    show(config) {
        const { alertModal, alertModalTitle, alertModalMessage, alertModalOkBtn } = this.dom;
        if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) return;
        alertModalTitle.textContent = config.title;
        alertModalMessage.textContent = config.message;
        alertModal.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        alertModalOkBtn.onclick = () => { this.hide(); if (config.onConfirm) config.onConfirm(); };
    }
    hide() { this.dom.alertModal?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN); }
}

document.addEventListener('template-loaded', () => {
    if (document.getElementById(CONSTANTS.DOM.APP_CONTAINER_ID)) {
        new JusticeExamApp();
    }
});
