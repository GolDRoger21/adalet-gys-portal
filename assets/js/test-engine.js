/**
 * @file Adalet GYS Portalı için ana sınav motoru ve uygulama mantığı.
 * @description Şablonu kendi içinde yükleyen ve sağlam CSV ayrıştırma yapan nihai versiyon.
 * @version 5.1 (Robust CSV Parsing)
 */

class JusticeExamApp {
    constructor(containerElement) {
        this.container = containerElement;
        if (!this.container) {
            console.error("Ana uygulama konteyneri bulunamadı!");
            return;
        }
        this.config = {
            sheetUrl: this.container.dataset.sheetUrl,
            duration: this.container.dataset.examDuration || 120
        };
        this.domElements = {};
        this.init();
    }

    async init() {
        try {
            const response = await fetch('/adalet-gys-portal/_templates/sinav-sablonu.html');
            if (!response.ok) throw new Error('Sınav arayüzü şablonu yüklenemedi.');
            this.container.innerHTML = await response.text();
            
            this._initializeDOMElements();
            await this._fetchAndParseSheetData();

        } catch (error) {
            const container = document.getElementById('sinav-container') || document.body;
            container.innerHTML = `<div class="card p-8 text-center"><h1 class="text-2xl font-bold text-red-600">Bir Hata Oluştu</h1><p class="text-slate-600 mt-4">${error.message}</p></div>`;
            console.error('Uygulama başlatılamadı:', error);
        }
    }

    _initializeDOMElements() {
        const elementIds = ['welcome-screen','quiz-screen','start-exam-btn','elapsed-time','remaining-time','question-counter','question-text','options-container','prev-btn','next-btn','mark-review-btn','finish-btn','nav-palette-container','result-modal','correct-count','incorrect-count','empty-count','success-rate','success-rate-box','performance-summary','wrong-answers-container','marked-questions-container','wrong-answers-tab','marked-questions-tab','wrong-answers-panel','marked-questions-panel','start-btn-full-text','total-question-count','total-duration-display','alert-modal','alert-modal-title','alert-modal-message','alert-modal-ok-btn','restart-btn','close-result-modal-btn','flag-outline-icon','flag-solid-icon','warning-box','warning-message'];
        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            this.domElements[camelCaseId] = document.getElementById(id);
        });
    }

    _initializeApp(questionPool) {
        const examDuration = parseInt(this.config.duration, 10);
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = ` ${examDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;

        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);
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
    constructor(questions, durationMinutes, app) {
        this.questions = questions; this.durationMinutes = durationMinutes; this.app = app;
        this.currentQuestionIndex = 0; this.userAnswers = []; this.timerInterval = null; this.timeRemaining = 0;
    }
    startExam() {
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false }));
        this.timeRemaining = this.durationMinutes * 60;
        this.app.domElements.welcomeScreen?.classList.add('hidden');
        this.app.domElements.quizScreen?.classList.remove('hidden');
        this.startTimer();
        this.app.uiManager.renderQuestion();
        this.app.uiManager.bindQuizEvents();
    }
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    goToNextQuestion() { if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; this.app.uiManager.renderQuestion(); } }
    goToPrevQuestion() { if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; this.app.uiManager.renderQuestion(); } }
    selectAnswer(optionKey) {
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        this.app.uiManager.renderQuestion();
        if (this.currentQuestionIndex < this.questions.length - 1) {
            setTimeout(() => this.goToNextQuestion(), 300);
        }
    }
    toggleMarkForReview() {
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        this.app.uiManager.updateNavPalette();
        this.app.uiManager.updateButtonStates();
    }
    navigateToQuestion(index) { if (index >= 0 && index < this.questions.length) { this.currentQuestionIndex = index; this.app.uiManager.renderQuestion(); } }
    finishQuiz(isAuto = false) {
        if (!isAuto) {
            this.app.modalManager.show({ title: 'Sınavı Bitir', message: 'Sınavı bitirmek istediğinizden emin misiniz?', onConfirm: () => this.performFinish() });
        } else {
            this.performFinish();
        }
    }
    performFinish() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        let correct = 0, incorrect = 0, empty = 0;
        const incorrectQuestions = []; const markedQuestions = [];
        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];
            if (userAnswerData.isMarkedForReview) { markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
            if (!userAnswerData.userAnswer) empty++;
            else if (userAnswerData.userAnswer === q.correctAnswer) correct++;
            else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
        });
        this.app.uiManager.renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions);
        this.app.domElements.quizScreen.classList.add('hidden');
        this.app.domElements.resultModal.classList.remove('hidden');
    }
    startTimer() {
        const totalDuration = this.durationMinutes * 60;
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) { clearInterval(this.timerInterval); this.finishQuiz(true); return; }
            this.timeRemaining--;
            this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            this.app.domElements.elapsedTime.textContent = this.formatTime(totalDuration - this.timeRemaining);
        }, 1000);
    }
}

class UIManager {
    constructor(domElements, examManager) { this.dom = domElements; this.examManager = examManager; }
    renderQuestion() { /* ... Bu fonksiyon eski çalışan kodunuzdan alınabilir, temel mantık aynı ... */ }
    updateNavPalette() { /* ... Bu fonksiyon eski çalışan kodunuzdan alınabilir, temel mantık aynı ... */ }
    updateButtonStates() { /* ... Bu fonksiyon eski çalışan kodunuzdan alınabilir, temel mantık aynı ... */ }
    renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions) {
        this.dom.correctCount.textContent = correct;
        this.dom.incorrectCount.textContent = incorrect;
        this.dom.emptyCount.textContent = empty;
        const total = this.examManager.questions.length;
        this.dom.successRate.textContent = `${(total > 0 ? (correct / total * 100) : 0).toFixed(1)}%`;
        // ... yanlış ve işaretli soruları render etme mantığı buraya eklenebilir ...
    }
    switchResultTab(tabName) { /* ... Bu fonksiyon eski çalışan kodunuzdan alınabilir, temel mantık aynı ... */ }
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
        this.dom.alertModalTitle.textContent = config.title;
        this.dom.alertModalMessage.textContent = config.message;
        this.dom.alertModal.classList.remove('hidden');
        this.dom.alertModal.classList.add('flex');
        this.dom.alertModalOkBtn.onclick = () => { this.hide(); if (config.onConfirm) config.onConfirm(); };
    }
    hide() {
        this.dom.alertModal.classList.add('hidden');
        this.dom.alertModal.classList.remove('flex');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('sinav-container');
    if (container) {
        new JusticeExamApp(container);
    }
});
