/**
 * @file Adalet GYS Portalı için Merkezi Sınav Motoru
 * @description Google E-Tablolar'dan veri çeken, sınavı yöneten ve modern UI özelliklerini (ilerleme çubuğu, zamanlayıcı uyarısı) destekleyen ana mantık.
 * @version 1.8 (Final Stable Version with UI Redesign)
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
            'mark-review-btn', 'finish-btn', 'nav-palette-container', 'result-screen',
            'correct-count', 'incorrect-count', 'empty-count', 'success-rate', 'success-rate-box', 'success-text',
            'performance-summary', 'wrong-answers-container', 'marked-questions-container', 'wrong-answers-tab',
            'marked-questions-tab', 'wrong-answers-panel', 'marked-questions-panel', 'start-btn-full-text',
            'total-question-count', 'total-duration-display', 'alert-modal', 'alert-modal-title',
            'alert-modal-message', 'alert-modal-ok-btn', 'restart-btn',
            'flag-outline-icon', 'flag-solid-icon',
            'progress-bar' // YENİ: İlerleme çubuğu eklendi
        ];
        const elements = {};
        elementIds.forEach(id => {
            const camelCaseId = id.replace(/-(\w)/g, (_, letter) => letter.toUpperCase());
            elements[camelCaseId] = document.getElementById(id);
        });
        return elements;
    }

    _initializeApp(questionPool) {
        const examDuration = this.config.duration ? parseInt(this.config.duration, 10) : Math.ceil(questionPool.length * 1.2);
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = ` ${examDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;
        
        this.examManager = new ExamManager(questionPool, examDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);

        this.examManager.uiManager = this.uiManager;
        this.examManager.modalManager = this.modalManager;

        this._bindEventListeners();
    }

    _bindEventListeners() {
        this.domElements.startExamBtn?.addEventListener('click', () => this.examManager.startExam());
        this.domElements.restartBtn?.addEventListener('click', () => window.location.reload());
        this.domElements.wrongAnswersTab?.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
        this.domElements.markedQuestionsTab?.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
    }

    async _fetchAndParseSheetData() {
        try {
            if (!this.config.sheetUrl) throw new Error("Google Sheet linki bulunamadı.");
            const response = await fetch(this.config.sheetUrl);
            if (!response.ok) throw new Error(`Sorular Google Sheet'ten çekilemedi. Durum kodu: ${response.status}`);
            const csvText = await response.text();
            if (!csvText) throw new Error("CSV verisi boş.");

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
            if (this.domElements.welcomeScreen) {
                this.domElements.welcomeScreen.innerHTML = `<div class="card p-8 text-center"><h1 class="text-xl font-bold text-red-600">Sınav Başlatılamadı</h1><p class="mt-4 text-slate-600">${error.message}</p><button onclick="window.location.reload()" class="btn mt-6">Tekrar Dene</button></div>`;
            }
        }
    }

    _robustCsvParse(csvText) {
        const rows = []; let currentRow = []; let currentField = ''; let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i]; const nextChar = normalizedText[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') { currentField += '"'; i++; } else { inQuotes = !inQuotes; }
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
        this.questions = questions;
        this.durationMinutes = durationMinutes;
        this.app = app;
        this.currentQuestionIndex = 0;
        this.userAnswers = [];
        this.timerInterval = null;
        this.timeRemaining = 0;
        this.uiManager = null;
        this.modalManager = null;
    }

    startExam() {
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false }));
        this.timeRemaining = this.durationMinutes * 60;
        this.app.domElements.welcomeScreen?.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.app.domElements.quizScreen?.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.startTimer();
        this.uiManager.renderQuestion();
        this.uiManager.bindQuizEvents();
    }

    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    startTimer() {
        const totalDuration = this.durationMinutes * 60;
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.finishQuiz(true);
                return;
            }
            this.timeRemaining--;
            const remainingTimeEl = this.app.domElements.remainingTime;
            const elapsedSeconds = totalDuration - this.timeRemaining;

            if (remainingTimeEl) remainingTimeEl.textContent = this.formatTime(this.timeRemaining);
            if (this.app.domElements.elapsedTime) this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSeconds);

            // === YENİ: Son 5 dakika uyarısı ===
            if (this.timeRemaining === 300) { // 5 dakika = 300 saniye
                remainingTimeEl?.classList.add(CONSTANTS.CSS_CLASSES.TIMER_WARNING);
            }
        }, 1000);
    }
    
    goToNextQuestion() { if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; this.uiManager.renderQuestion(); } }
    goToPrevQuestion() { if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; this.uiManager.renderQuestion(); } }
    selectAnswer(optionKey) { this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey; this.uiManager.renderQuestion(); if (this.currentQuestionIndex < this.questions.length - 1) { setTimeout(() => this.goToNextQuestion(), 300); } }
    toggleMarkForReview() { this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview; this.uiManager.updateNavPalette(); this.uiManager.updateButtonStates(); }
    navigateToQuestion(index) { if (index >= 0 && index < this.questions.length) { this.currentQuestionIndex = index; this.uiManager.renderQuestion(); } }

    finishQuiz(isAuto = false) {
        if (!isAuto) {
            this.modalManager.show({ title: 'Sınavı Bitir', message: 'Sınavı bitirmek istediğinizden emin misiniz?', onConfirm: () => this.performFinish() });
        } else {
            this.performFinish();
        }
    }

    performFinish() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        let correct = 0, incorrect = 0, empty = 0;
        const incorrectQuestions = [], markedQuestions = [];
        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];
            if (userAnswerData.isMarkedForReview) { markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
            if (!userAnswerData.userAnswer) empty++;
            else if (userAnswerData.userAnswer === q.correctAnswer) correct++;
            else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
        });
        this.uiManager.renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions);
        this.app.domElements.quizScreen.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN);
        this.app.domElements.resultScreen.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
    }
}

class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements;
        this.examManager = examManager;
    }

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

        // === YENİ: İlerleme çubuğunu güncelle ===
        if (this.dom.progressBar) {
            const progressPercentage = ((this.examManager.currentQuestionIndex + 1) / this.examManager.questions.length) * 100;
            this.dom.progressBar.style.width = `${progressPercentage}%`;
        }
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
                const box = document.createElement('button'); box.textContent = index + 1;
                let statusClass = 'bg-slate-300';
                const userAnswerData = this.examManager.userAnswers[index];
                if (userAnswerData.isMarkedForReview) { statusClass = 'bg-yellow-400 text-white'; }
                else if (userAnswerData.userAnswer) { statusClass = 'bg-green-500 text-white'; }
                if (index === this.examManager.currentQuestionIndex) { box.classList.add('ring-4', 'ring-teal-500'); }
                box.className += ` nav-box w-full h-10 flex items-center justify-center rounded-md ${statusClass}`;
                box.onclick = () => this.examManager.navigateToQuestion(index);
                this.dom.navPaletteContainer.appendChild(box);
            });
        }
    }

    updateButtonStates() {
        if (this.dom.prevBtn) this.dom.prevBtn.disabled = this.examManager.currentQuestionIndex === 0;
        if (this.dom.nextBtn) this.dom.nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1;
        const isMarked = this.examManager.userAnswers[this.examManager.currentQuestionIndex]?.isMarkedForReview;
        if (this.dom.markReviewBtn) this.dom.markReviewBtn.classList.toggle(CONSTANTS.CSS_CLASSES.MARKED, !!isMarked);
        if (this.dom.flagOutlineIcon) this.dom.flagOutlineIcon.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !!isMarked);
        if (this.dom.flagSolidIcon) this.dom.flagSolidIcon.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isMarked);
    }

    renderResultsPage(correct, incorrect, empty, incorrectQuestions, markedQuestions) {
        if (this.dom.correctCount) this.dom.correctCount.textContent = correct;
        if (this.dom.incorrectCount) this.dom.incorrectCount.textContent = incorrect;
        if (this.dom.emptyCount) this.dom.emptyCount.textContent = empty;
        const total = this.examManager.questions.length;
        if (this.dom.successRate) this.dom.successRate.textContent = `${(total > 0 ? (correct / total * 100) : 0).toFixed(1)}%`;
        
        this._renderAnswerDetails(this.dom.wrongAnswersContainer, incorrectQuestions);
        this._renderAnswerDetails(this.dom.markedQuestionsContainer, markedQuestions);
    }

    _renderAnswerDetails(container, questions) {
        if (!container) return;
        container.innerHTML = '';
        if (questions.length === 0) {
            const message = container.id.includes('wrong') ? 'Tebrikler! Yanlış cevabınız bulunmuyor.' : 'İncelemek için herhangi bir soru işaretlemediniz.';
            container.innerHTML = `<p class="text-slate-600 p-4 bg-slate-50 rounded-lg">${message}</p>`;
            return;
        }
        questions.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200";
            itemDiv.innerHTML = this._createResultItemHTML(item);
            container.appendChild(itemDiv);
        });
    }

    _createResultItemHTML(item) {
        const q = item.question;
        const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');
        const userAnswer = item.userAnswer;
        let statusHTML = '';
        if(userAnswer) {
            const isCorrect = userAnswer === q.correctAnswer;
            statusHTML = `<span class="text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}">${isCorrect ? 'Doğru Cevaplandı' : 'Yanlış Cevaplandı'}</span>`;
        } else {
            statusHTML = `<span class="text-sm font-semibold text-slate-600">Boş Bırakıldı</span>`;
        }
        
        return `
            <div class="flex justify-between items-center mb-2"><p class="font-bold">Soru ${item.index + 1}:</p>${statusHTML}</div>
            <pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>
            ${this._createResultOptionsHTML(q, userAnswer)}
            ${q.explanation ? this._createExplanationHTML(q.explanation) : ''}
        `;
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

    _createExplanationHTML(explanation) {
        const separator = "Hafıza Tekniği:";
        const [summary, memoryTrick] = explanation.includes(separator) ? explanation.split(separator) : [explanation, ''];
        let html = '<div class="explanation-box"><h4>Soru Analizi</h4>';
        if (summary.replace("Konu Özeti:", "").trim()) {
            html += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${summary.replace("Konu Özeti:", "").trim()}</p></div>`;
        }
        if (memoryTrick.trim()) {
            html += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${memoryTrick.trim()}</p></div>`;
        }
        return html + '</div>';
    }
    
    switchResultTab(tabName) { 
        if (!this.dom.wrongAnswersPanel || !this.dom.markedQuestionsPanel) return; 
        const isWrongTab = tabName === 'wrong'; 
        this.dom.wrongAnswersPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, !isWrongTab); 
        this.dom.markedQuestionsPanel.classList.toggle(CONSTANTS.CSS_CLASSES.HIDDEN, isWrongTab); 
        this.dom.wrongAnswersTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, isWrongTab); 
        this.dom.markedQuestionsTab.classList.toggle(CONSTANTS.CSS_CLASSES.TAB_ACTIVE, !isWrongTab); 
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
        if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) {
            if (confirm(config.message || 'Emin misiniz?')) {
                config.onConfirm?.();
            }
            return;
        }
        alertModalTitle.textContent = config.title;
        alertModalMessage.textContent = config.message;
        alertModal.classList.remove(CONSTANTS.CSS_CLASSES.HIDDEN);
        alertModal.classList.add(CONSTANTS.CSS_CLASSES.FLEX);
        alertModalOkBtn.focus();
        alertModalOkBtn.onclick = () => { this.hide(); config.onConfirm?.(); };
    }
    hide() { if (this.dom.alertModal) { this.dom.alertModal.classList.add(CONSTANTS.CSS_CLASSES.HIDDEN); this.dom.alertModal.classList.remove(CONSTANTS.CSS_CLASSES.FLEX); } }
}

document.addEventListener('template-loaded', () => {
    if (document.getElementById(CONSTANTS.DOM.APP_CONTAINER_ID)) {
        setTimeout(() => { new JusticeExamApp(); }, 0);
    }
});
