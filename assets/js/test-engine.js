/**
 * @file Adalet GYS Portalı için ana sınav motoru ve uygulama mantığı.
 * @description Şablonu bekleyen, yüklenme durumunu yöneten ve sağlam çalışan nihai versiyon.
 * @version 6.0 (Clean Architecture Final)
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

        // UIManager ve ModalManager'ı erken başlatıyoruz
        this.uiManager = new UIManager(this.domElements, null);
        this.modalManager = new ModalManager(this.domElements);
        
        // 1. Adım: Kullanıcının isteği üzerine, sayfa ilk açıldığında "Yükleniyor..." durumunu ayarla
        this.uiManager.setLoadingState();
        
        // 2. Adım: Veriyi çekmeye başla
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
            'flag-outline-icon', 'flag-solid-icon'
        ];
        const elements = {};
        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            elements[camelCaseId] = document.getElementById(id);
        });
        return elements;
    }

    _initializeApp(questionPool) {
        const examDuration = this.config.duration 
            ? parseInt(this.config.duration, 10) 
            : Math.ceil(questionPool.length * CONSTANTS.EXAM.DEFAULT_MINUTES_PER_QUESTION);

        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager.examManager = this.examManager; // UIManager'a ExamManager'ı tanıt
        
        // 3. Adım: Veri geldikten sonra, "Yükleniyor..." durumunu gerçek verilerle güncelle
        this.uiManager.setReadyState(questionPool, this.examManager);
        
        this._bindEventListeners();
    }
    
    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => this.examManager.startExam());
        this.domElements.restartBtn?.addEventListener('click', () => window.location.reload());
        this.domElements.closeResultModalBtn?.addEventListener('click', () => window.location.reload());
        this.domElements.wrongAnswersTab?.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
        this.domElements.markedQuestionsTab?.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
    }

    async _fetchAndParseSheetData() {
        try {
            if (!this.config.sheetUrl) throw new Error("Google Sheet linki bulunamadı.");
            const response = await fetch(this.config.sheetUrl);
            if (!response.ok) throw new Error('Sorular Google Sheet\'ten çekilemedi.');
            const csvText = await response.text();
            
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
        } catch(error) {
            this.uiManager.setErrorState(error.message);
            console.error("Veri Çekme Hatası:", error);
        }
    }
    
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

class ExamManager {
    constructor(questions, durationMinutes, app) { this.questions = questions; this.durationMinutes = durationMinutes; this.app = app; this.currentQuestionIndex = 0; this.userAnswers = []; this.timerInterval = null; this.timeRemaining = 0; }
    startExam() { this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false })); this.timeRemaining = this.durationMinutes * 60; this.app.domElements.welcomeScreen?.classList.add('hidden'); this.app.domElements.quizScreen?.classList.remove('hidden'); this.startTimer(); this.app.uiManager.renderQuestion(); this.app.uiManager.bindQuizEvents(); }
    formatTime(seconds) { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }
    goToNextQuestion() { if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; this.app.uiManager.renderQuestion(); } }
    goToPrevQuestion() { if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; this.app.uiManager.renderQuestion(); } }
    selectAnswer(optionKey) { this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey; this.app.uiManager.renderQuestion(); if (this.currentQuestionIndex < this.questions.length - 1) { setTimeout(() => this.goToNextQuestion(), 300); } }
    toggleMarkForReview() { this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview; this.app.uiManager.updateNavPalette(); this.app.uiManager.updateButtonStates(); }
    navigateToQuestion(index) { if (index >= 0 && index < this.questions.length) { this.currentQuestionIndex = index; this.app.uiManager.renderQuestion(); } }
    finishQuiz(isAuto = false) { if (!isAuto) { this.app.modalManager.show({ title: 'Sınavı Bitir', message: 'Sınavı bitirmek istediğinizden emin misiniz?', onConfirm: () => this.performFinish() }); } else { this.performFinish(); } }
    performFinish() { if (this.timerInterval) clearInterval(this.timerInterval); let correct = 0, incorrect = 0, empty = 0; const incorrectQuestions = []; const markedQuestions = []; this.questions.forEach((q, i) => { const userAnswerData = this.userAnswers[i]; if (userAnswerData.isMarkedForReview) { markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); } if (!userAnswerData.userAnswer) empty++; else if (userAnswerData.userAnswer === q.correctAnswer) correct++; else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); } }); this.app.uiManager.renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions); this.app.domElements.quizScreen.classList.add('hidden'); this.app.domElements.resultModal.classList.remove('hidden'); }
    startTimer() { const totalDuration = this.durationMinutes * 60; this.timerInterval = setInterval(() => { if (this.timeRemaining <= 0) { clearInterval(this.timerInterval); this.finishQuiz(true); return; } this.timeRemaining--; this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining); this.app.domElements.elapsedTime.textContent = this.formatTime(totalDuration - this.timeRemaining); }, 1000); }
}

class UIManager {
    constructor(domElements, examManager) { this.dom = domElements; this.examManager = examManager; }
    setLoadingState() { if (this.dom.totalDurationDisplay) this.dom.totalDurationDisplay.textContent = '...'; if (this.dom.totalQuestionCount) this.dom.totalQuestionCount.textContent = '...'; if (this.dom.startBtnFullText) this.dom.startBtnFullText.textContent = 'Sorular Hesaplanıyor...'; }
    setReadyState(questionPool, examManager) { if (this.dom.totalDurationDisplay) this.dom.totalDurationDisplay.innerHTML = ` ${examManager.durationMinutes} Dakika`; if (this.dom.totalQuestionCount) this.dom.totalQuestionCount.textContent = ` ${questionPool.length} Soru`; if (this.dom.startBtnFullText) this.dom.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`; if (this.dom.startExamBtn) this.dom.startExamBtn.disabled = false; }
    setErrorState(message) { if (this.dom.startBtnFullText) this.dom.startBtnFullText.textContent = 'HATA OLUŞTU'; if (this.dom.appContainer) this.dom.appContainer.innerHTML += `<p style="color: red; text-align: center; margin-top: 1rem;">Hata: ${message}</p>`; }
    renderQuestion() { const question = this.examManager.questions[this.examManager.currentQuestionIndex]; if (this.dom.questionCounter) this.dom.questionCounter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`; if (this.dom.questionText) this.dom.questionText.textContent = question.questionText.replace(/^\d+[\.\)-]\s*/, ''); if (this.dom.optionsContainer) { this.dom.optionsContainer.innerHTML = ''; Object.entries(question.options).forEach(([key, optionText]) => { if (optionText) { const button = this._createOptionButton(key, optionText); this.dom.optionsContainer.appendChild(button); } }); } this.updateNavPalette(); this.updateButtonStates(); }
    _createOptionButton(key, optionText) { const button = document.createElement('button'); const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key; button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg border'; button.innerHTML = `<span class="option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4">${key}</span><span class="text-justify w-full">${optionText}</span>`; if (isSelected) button.classList.add('option-selected'); button.onclick = () => this.examManager.selectAnswer(key); return button; }
    updateNavPalette() { if (this.dom.navPaletteContainer) { this.dom.navPaletteContainer.innerHTML = ''; this.examManager.questions.forEach((_, index) => { const box = document.createElement('button'); box.textContent = index + 1; let statusClass = 'bg-slate-300'; const userAnswerData = this.examManager.userAnswers[index]; if (userAnswerData.isMarkedForReview) { statusClass = 'bg-yellow-400 text-white'; } else if (userAnswerData.userAnswer) { statusClass = 'bg-green-500 text-white'; } if (index === this.examManager.currentQuestionIndex) { box.classList.add('ring-4', 'ring-teal-500'); } box.className += ` nav-box w-full h-10 flex items-center justify-center rounded-md ${statusClass}`; box.onclick = () => this.examManager.navigateToQuestion(index); this.dom.navPaletteContainer.appendChild(box); }); } }
    updateButtonStates() { this.dom.prevBtn.disabled = this.examManager.currentQuestionIndex === 0; this.dom.nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1; }
    renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions) { this.dom.correctCount.textContent = correct; this.dom.incorrectCount.textContent = incorrect; this.dom.emptyCount.textContent = empty; const total = this.examManager.questions.length; this.dom.successRate.textContent = `${(total > 0 ? (correct / total * 100) : 0).toFixed(1)}%`; /* ... */ }
    switchResultTab(tabName) { if (!this.dom.wrongAnswersPanel || !this.dom.markedQuestionsPanel) return; const isWrongTab = tabName === 'wrong'; this.dom.wrongAnswersPanel.classList.toggle('hidden', !isWrongTab); this.dom.markedQuestionsPanel.classList.toggle('hidden', isWrongTab); this.dom.wrongAnswersTab.classList.toggle('tab-active', isWrongTab); this.dom.markedQuestionsTab.classList.toggle('tab-active', !isWrongTab); }
    bindQuizEvents() { this.dom.nextBtn?.addEventListener('click', () => this.examManager.goToNextQuestion()); this.dom.prevBtn?.addEventListener('click', () => this.examManager.goToPrevQuestion()); this.dom.markReviewBtn?.addEventListener('click', () => this.examManager.toggleMarkForReview()); this.dom.finishBtn?.addEventListener('click', () => this.examManager.finishQuiz(false)); }
}

class ModalManager {
    constructor(domElements) { this.dom = domElements; this._bindModalEvents(); }
    _bindModalEvents() { this.dom.alertModalOkBtn?.addEventListener('click', () => this.hide()); }
    show(config) {
        const { alertModal, alertModalTitle, alertModalMessage, alertModalOkBtn } = this.dom;
        if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) return;
        alertModalTitle.textContent = config.title;
        alertModalMessage.textContent = config.message;
        alertModal.classList.remove('hidden');
        alertModal.classList.add('flex');
        alertModalOkBtn.focus();
        alertModalOkBtn.onclick = () => { this.hide(); if (config.onConfirm) config.onConfirm(); };
    }
    hide() { if (this.dom.alertModal) { this.dom.alertModal.classList.add('hidden'); this.dom.alertModal.classList.remove('flex'); } }
}

// --- NİHAİ BAŞLATMA KODU ---
document.addEventListener('template-loaded', () => {
    if (document.getElementById('app-container')) {
        setTimeout(() => { new JusticeExamApp(); }, 0);
    }
});
