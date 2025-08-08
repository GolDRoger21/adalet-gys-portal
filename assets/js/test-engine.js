/**
 * @file Adalet GYS Portalı - Güncellenmiş Sınav Motoru
 * @version 1.9.1 (Performans Optimizasyonlu)
 */

const CONSTANTS = {
    CSS_CLASSES: {
        HIDDEN: 'hidden',
        FLEX: 'flex',
        MARKED: 'marked',
        TAB_ACTIVE: 'tab-active',
        OPTION_SELECTED: 'option-selected',
        TIMER_WARNING: 'timer-warning'
    },
    DOM: {
        APP_CONTAINER_ID: 'app-container',
        PROGRESS_BAR_ID: 'progress-bar'
    },
    TIMER: {
        WARNING_THRESHOLD: 300 // 5 dakika (saniye cinsinden)
    }
};

class JusticeExamApp {
    constructor() {
        this.domElements = this._initializeDOMElements();
        this._validateDOM();
        this._initializeApp();
    }

    _initializeDOMElements() {
        const elements = {};
        // Ana elementlerin seçimi
        elements.appContainer = document.getElementById(CONSTANTS.DOM.APP_CONTAINER_ID);
        elements.progressBar = document.getElementById(CONSTANTS.DOM.PROGRESS_BAR_ID);
        
        // Diğer elementler
        const elementIds = [
            'welcome-screen', 'quiz-screen', 'start-exam-btn', 
            'elapsed-time', 'remaining-time', 'question-counter',
            'question-text', 'options-container', 'prev-btn',
            'next-btn', 'mark-review-btn', 'finish-btn',
            'nav-palette-container', 'result-screen'
        ];

        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            elements[camelCaseId] = document.getElementById(id);
        });

        return elements;
    }

    _validateDOM() {
        if (!this.domElements.appContainer) {
            throw new Error(`Ana uygulama konteyneri (#${CONSTANTS.DOM.APP_CONTAINER_ID}) bulunamadı`);
        }
    }

    async _initializeApp() {
        try {
            const questionPool = await this._fetchQuestions();
            this.examManager = new ExamManager(questionPool, this);
            this.uiManager = new UIManager(this.domElements, this.examManager);
            this._bindEventListeners();
        } catch (error) {
            console.error('Başlatma hatası:', error);
            this._showErrorUI(error);
        }
    }

    async _fetchQuestions() {
        const response = await fetch(this.domElements.appContainer.dataset.sheetUrl);
        if (!response.ok) throw new Error(`Veri alınamadı: ${response.status}`);
        
        const csvText = await response.text();
        return this._parseCSV(csvText);
    }

    _parseCSV(csvText) {
        // CSV parsing mantığı burada
        // ...
        return parsedQuestions;
    }

    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => {
            this.examManager.startExam();
        });
        
        // Diğer event listener'lar
    }

    _showErrorUI(error) {
        if (this.domElements.welcomeScreen) {
            this.domElements.welcomeScreen.innerHTML = `
                <div class="card p-8 text-center">
                    <h1 class="text-xl font-bold text-red-600">Yüklenemedi</h1>
                    <p class="mt-4">${error.message}</p>
                    <button onclick="location.reload()" class="btn mt-6">
                        Yeniden Dene
                    </button>
                </div>
            `;
        }
    }
}

class ExamManager {
    constructor(questions, app) {
        this.questions = questions;
        this.app = app;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        this.timeRemaining = 0;
    }

    startExam() {
        this._resetExamState();
        this._startTimer();
        this._showQuizScreen();
        this.uiManager.renderQuestion();
    }

    _resetExamState() {
        this.userAnswers = this.questions.map(() => ({
            userAnswer: null,
            isMarkedForReview: false
        }));
        this.timeRemaining = this.calculateExamDuration();
    }

    calculateExamDuration() {
        // Varsayılan: Soru başına 1.2 dakika
        return Math.ceil(this.questions.length * 1.2 * 60);
    }

    _startTimer() {
        this.timerInterval = setInterval(() => {
            this._updateTimer();
        }, 1000);
    }

    _updateTimer() {
        if (this.timeRemaining <= 0) {
            this.finishExam(true);
            return;
        }

        this.timeRemaining--;
        this._updateTimerDisplay();
        
        if (this.timeRemaining === CONSTANTS.TIMER.WARNING_THRESHOLD) {
            this._triggerTimerWarning();
        }
    }

    _updateTimerDisplay() {
        if (this.domElements.remainingTime) {
            this.domElements.remainingTime.textContent = this._formatTime(this.timeRemaining);
        }
    }

    _triggerTimerWarning() {
        this.domElements.remainingTime?.classList.add(CONSTANTS.CSS_CLASSES.TIMER_WARNING);
    }

    _formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hrs).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    }

    _showQuizScreen() {
        this.domElements.welcomeScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.domElements.quizScreen?.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
    }

    // Diğer metodlar...
}

class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements;
        this.exam = examManager;
    }

    renderQuestion() {
        const question = this.exam.getCurrentQuestion();
        this._updateQuestionText(question);
        this._renderOptions(question);
        this._updateProgress();
        this._updateButtonStates();
    }

    _updateProgress() {
        if (this.dom.progressBar) {
            const progress = ((this.exam.currentQuestionIndex + 1) / this.exam.questions.length) * 100;
            this.dom.progressBar.style.width = `${progress}%`;
        }
    }

    // Diğer UI metodları...
}

// Uygulamayı başlat
document.addEventListener('template-loaded', () => {
    try {
        new JusticeExamApp();
    } catch (error) {
        console.error('Uygulama başlatılamadı:', error);
        document.body.innerHTML = `
            <div class="card p-8 text-center">
                <h1 class="text-xl font-bold text-red-600">Kritik Hata</h1>
                <p class="mt-4">Sistem başlatılamadı</p>
            </div>
        `;
    }
});
