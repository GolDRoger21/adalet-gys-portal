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
        this.GOOGLE_SHEET_URL = this.domElements.appContainer.dataset.sheetUrl;
        this.examManager = null;
        this.uiManager = null;
        this.modalManager = null;
        this.fetchAndParseSheetData();
    }

    initializeDOMElements() {
        return {
            appContainer: document.getElementById('app-container'),
            welcomeScreen: document.getElementById('welcome-screen'),
            quizScreen: document.getElementById('quiz-screen'),
            startExamBtn: document.getElementById('start-exam-btn'),
            elapsedTime: document.getElementById('elapsed-time'),
            remainingTime: document.getElementById('remaining-time'),
            timerAnnouncer: document.getElementById('timer-announcer'),
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

    initializeApp(questionPool) {
        if (!Array.isArray(questionPool) || questionPool.length === 0) {
            this.showError("Google Sheet'ten soru verisi alınamadı veya format hatalı.");
            return;
        }
        const calculatedDuration = Math.ceil(questionPool.length * 1.5);
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = `&nbsp;${calculatedDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `SINAVA BAŞLA (${questionPool.length} Soru)`;
        this.domElements.startExamBtn.disabled = false;
        this.examManager = new ExamManager(questionPool, calculatedDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);
        this.bindEventListeners();
    }

    showError(message) {
        const { startExamBtn, startBtnFullText, totalQuestionCount, warningBox, warningMessage } = this.domElements;
        if (startExamBtn) startExamBtn.disabled = true;
        if (startBtnFullText) startBtnFullText.textContent = "HATA OLUŞTU";
        if (totalQuestionCount) totalQuestionCount.textContent = "0";
        if (warningMessage) warningMessage.textContent = message;
        if (warningBox) warningBox.classList.remove('hidden');
        console.error("Uygulama Hatası:", message);
    }

    bindEventListeners() {
        const { startExamBtn, restartBtn, closeResultModalBtn, wrongAnswersTab, markedQuestionsTab } = this.domElements;
        if (startExamBtn) startExamBtn.addEventListener('click', () => this.startExam());
        if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());
        if (closeResultModalBtn) closeResultModalBtn.addEventListener('click', () => window.location.reload());
        if (wrongAnswersTab && markedQuestionsTab && this.uiManager) {
            wrongAnswersTab.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
            markedQuestionsTab.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
        }
    }
    
    startExam() {
        if (this.domElements.welcomeScreen) this.domElements.welcomeScreen.classList.add('hidden');
        if (this.examManager) this.examManager.startExam();
    }

    robustCsvParse(csvText) {
        const rows = [];
        let fields = [];
        let currentField = '';
        let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            const nextChar = normalizedText[i + 1];
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField);
                currentField = '';
            } else if (char === '\n' && !inQuotes) {
                fields.push(currentField);
                if (fields.length > 1 || fields[0].trim() !== '') {
                    rows.push(fields);
                }
                fields = [];
                currentField = '';
            } else {
                currentField += char;
            }
        }
        if (currentField || fields.length > 0) {
            fields.push(currentField);
            rows.push(fields);
        }
        return rows;
    }

    async fetchAndParseSheetData() {
        if (!this.GOOGLE_SHEET_URL) {
            this.showError("Google Sheet linki bulunamadı.");
            return;
        }
        try {
            const response = await fetch(this.GOOGLE_SHEET_URL);
            if (!response.ok) throw new Error(`Ağ yanıtı başarısız: ${response.status}`);
            const csvText = await response.text();
            if (!csvText) throw new Error("CSV verisi boş.");

            const parsedRows = this.robustCsvParse(csvText);
            if (parsedRows.length < 2) throw new Error("CSV dosyasında yeterli veri bulunamadı.");

            const headers = parsedRows[0].map(h => h.trim());
            const requiredHeaders = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];
            if (requiredHeaders.some(h => !headers.includes(h))) {
                throw new Error(`Eksik başlıklar: ${requiredHeaders.filter(h => !headers.includes(h)).join(', ')}`);
            }
            
            const questionPool = parsedRows.slice(1).map(rowArray => {
                if (rowArray.every(field => field.trim() === '')) return null;
                const data = {};
                headers.forEach((header, i) => { data[header] = rowArray[i] || ''; });
                return {
                    questionText: data.questionText,
                    options: { A: data.optionA, B: data.optionB, C: data.optionC, D: data.optionD, E: data.optionE || '' },
                    correctAnswer: data.correctAnswer.trim().toUpperCase(),
                    explanation: data.explanation || ''
                };
            }).filter(q => q && q.questionText && q.correctAnswer);
            
            if (questionPool.length === 0) throw new Error("Hiç geçerli soru bulunamadı.");
            this.initializeApp(questionPool);
        } catch (error) {
            console.error('Veri çekme hatası:', error);
            this.showError(`Sorular çekilirken hata oluştu: ${error.message}`);
        }
    }
}

class ExamManager {
    constructor(questions, durationMinutes, app) {
        this.questions = questions; this.durationMinutes = durationMinutes; this.app = app; this.currentQuestionIndex = 0; this.userAnswers = []; this.timerInterval = null; this.timeRemaining = 0;
        this.handleVisibilityChange = () => {
            if (document.hidden && this.app.modalManager) {
                this.app.modalManager.show({ title: 'UYARI', message: 'Sınav sırasında başka bir sekmeye geçtiniz. Lütfen sınava odaklanın.' });
            }
        };
    }
    startExam() {
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false }));
        this.timeRemaining = this.durationMinutes * 60;
        if (this.app.domElements.quizScreen) this.app.domElements.quizScreen.classList.remove('hidden');
        this.startTimer();
        if (this.app.uiManager) { this.app.uiManager.renderQuestion(); this.app.uiManager.bindQuizEvents(); }
    }
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    goToNextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; if (this.app.uiManager) this.app.uiManager.renderQuestion(); }
    }
    goToPrevQuestion() {
        if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; if (this.app.uiManager) this.app.uiManager.renderQuestion(); }
    }
    selectAnswer(optionKey) {
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        if (this.app.uiManager) this.app.uiManager.renderQuestion();
        if (this.currentQuestionIndex < this.questions.length - 1) { setTimeout(() => this.goToNextQuestion(), 200); }
    }
    toggleMarkForReview() {
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        if (this.app.uiManager) { this.app.uiManager.updateNavPalette(); this.app.uiManager.updateButtonStates(); }
    }
    navigateToQuestion(index) {
        if (index >= 0 && index < this.questions.length) { this.currentQuestionIndex = index; if (this.app.uiManager) this.app.uiManager.renderQuestion(); }
    }
    finishQuiz(isAuto = false) {
        if (isAuto) { this.performFinish(); }
        else if (this.app.modalManager) { this.app.modalManager.show({ title: 'Sınavı Bitir', message: 'Sınavı bitirmek istediğinizden emin misiniz?', onConfirm: () => this.performFinish() }); }
    }
    performFinish() {
        if (this.timerInterval) clearInterval(this.timerInterval); this.timerInterval = null;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);
        let correct = 0, incorrect = 0, empty = 0; const incorrectQuestions = [], markedQuestions = [];
        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];
            if (userAnswerData.isMarkedForReview) markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer });
            if (!userAnswerData.userAnswer) empty++;
            else if (userAnswerData.userAnswer.toUpperCase() === q.correctAnswer.toUpperCase()) correct++;
            else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
        });
        const totalQuestions = this.questions.length; const successPercentage = totalQuestions > 0 ? (correct / totalQuestions * 100) : 0;
        const { correctCount, incorrectCount, emptyCount, successRate, quizScreen, resultModal } = this.app.domElements;
        if (correctCount) correctCount.textContent = correct; if (incorrectCount) incorrectCount.textContent = incorrect; if (emptyCount) emptyCount.textContent = empty; if (successRate) successRate.textContent = `${successPercentage.toFixed(1)}%`;
        if (this.app.uiManager) this.app.uiManager.updateSuccessRateAppearance(successPercentage);
        if (quizScreen) quizScreen.classList.add('hidden');
        if (resultModal) { resultModal.classList.remove('hidden'); resultModal.focus(); }
        if (this.app.uiManager) this.app.uiManager.renderResultsPage(incorrectQuestions, markedQuestions);
    }
    startTimer() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange); const totalDuration = this.durationMinutes * 60;
        const { remainingTime, elapsedTime, timerAnnouncer } = this.app.domElements;
        if (remainingTime) { remainingTime.textContent = this.formatTime(this.timeRemaining); remainingTime.classList.remove('timer-warning'); }
        if (elapsedTime) elapsedTime.textContent = this.formatTime(0); if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) { clearInterval(this.timerInterval); this.finishQuiz(true); return; }
            this.timeRemaining--;
            if (remainingTime) remainingTime.textContent = this.formatTime(this.timeRemaining);
            if (elapsedTime) elapsedTime.textContent = this.formatTime(totalDuration - this.timeRemaining);
            if (this.timeRemaining <= 300 && remainingTime && !remainingTime.classList.contains('timer-warning')) {
                remainingTime.classList.add('timer-warning');
                if (timerAnnouncer) timerAnnouncer.textContent = 'Sınavın bitmesine son 5 dakika kaldı.';
            }
        }, 1000);
    }
}

class UIManager {
    constructor(domElements, examManager) { this.dom = domElements; this.examManager = examManager; }
    renderQuestion() {
        const question = this.examManager.questions[this.examManager.currentQuestionIndex];
        if (this.dom.counter) this.dom.counter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`;
        if (this.dom.questionText) { const cleanQuestionText = question.questionText.replace(/^\d+[\.\)-]\s*/, ''); this.dom.questionText.textContent = cleanQuestionText; }
        if (this.dom.optionsContainer) {
            this.dom.optionsContainer.innerHTML = '';
            Object.entries(question.options).forEach(([key, optionText]) => {
                if (optionText) { const button = this.createOptionButton(key, optionText); this.dom.optionsContainer.appendChild(button); }
            });
        }
        this.updateNavPalette(); this.updateButtonStates();
    }
    createOptionButton(key, optionText) {
        const button = document.createElement('button');
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key;
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg'; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', isSelected.toString());
        button.innerHTML = `<span class="option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4">${key}</span><span class="text-justify w-full">${optionText}</span>`;
        if (isSelected) button.classList.add('option-selected');
        button.onclick = () => this.examManager.selectAnswer(key);
        return button;
    }
    updateNavPalette() {
        if (!this.dom.navPalette) return; this.dom.navPalette.innerHTML = '';
        this.examManager.questions.forEach((_, index) => {
            const box = document.createElement('button'); box.textContent = index + 1; box.setAttribute('aria-label', `Soru ${index + 1}'ye git`);
            let statusClass = ' bg-slate-300 hover:bg-slate-400';
            if (this.examManager.userAnswers[index].isMarkedForReview) statusClass = ' bg-yellow-400 text-white hover:bg-yellow-500';
            else if (this.examManager.userAnswers[index].userAnswer) statusClass = ' bg-green-500 text-white hover:bg-green-600';
            let ringClass = index === this.examManager.currentQuestionIndex ? ' ring-4 ring-offset-2 ring-teal-500 scale-110 z-10' : '';
            box.className = `nav-box w-full h-10 flex items-center justify-center rounded-md border border-transparent${statusClass}${ringClass}`;
            box.onclick = () => this.examManager.navigateToQuestion(index); this.dom.navPalette.appendChild(box);
        });
    }
    updateButtonStates() {
        const { prevBtn, nextBtn, markReviewBtn, flagOutlineIcon, flagSolidIcon } = this.dom;
        if (prevBtn) prevBtn.disabled = this.examManager.currentQuestionIndex === 0; if (nextBtn) nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1;
        const isMarked = this.examManager.userAnswers[this.examManager.currentQuestionIndex]?.isMarkedForReview;
        if (markReviewBtn) markReviewBtn.classList.toggle('marked', isMarked); if (flagOutlineIcon) flagOutlineIcon.classList.toggle('hidden', isMarked); if (flagSolidIcon) flagSolidIcon.classList.toggle('hidden', !isMarked);
    }
    renderResultsPage(incorrectQuestions, markedQuestions) { this.renderWrongAnswers(incorrectQuestions); this.renderMarkedQuestions(markedQuestions); }
    _createResultOptionsHTML(q, userAnswer) {
        let optionsHTML = '<div class="space-y-2 mt-4 text-sm">';
        for (const [key, text] of Object.entries(q.options)) {
            if (!text) continue; let classes = 'border-slate-200 bg-slate-50 text-slate-700'; let icon = `<span class="font-bold text-slate-500">${key})</span>`;
            if (key.toUpperCase() === q.correctAnswer.toUpperCase()) { classes = 'border-green-400 bg-green-50 text-green-800 font-medium'; icon = `<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`; }
            else if (key.toUpperCase() === userAnswer?.toUpperCase()) { classes = 'border-red-400 bg-red-50 text-red-800 font-medium'; icon = `<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`; }
            optionsHTML += `<div class="flex items-start p-3 rounded-lg border ${classes}"><div class="flex-shrink-0 w-5 h-5 mr-3">${icon}</div><p class="text-justify flex-1">${text}</p></div>`;
        }
        optionsHTML += '</div>'; return optionsHTML;
    }
    renderWrongAnswers(incorrectQuestions) {
        const { wrongAnswersContainer } = this.dom; if (!wrongAnswersContainer) return; wrongAnswersContainer.innerHTML = '';
        if (incorrectQuestions.length === 0) { wrongAnswersContainer.innerHTML = `<p class="text-green-600 p-4 bg-green-50 rounded-lg">Tebrikler! Yanlış cevabınız bulunmuyor.</p>`; return; }
        incorrectQuestions.forEach(item => {
            const { question: q, index, userAnswer } = item; const resultItemDiv = document.createElement('div'); resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200"; const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');
            let explanationHTML = '';
            if (q.explanation) {
                const separator = "Hafıza Tekniği:"; let konuOzeti = q.explanation; let hafizaTeknigi = "";
                const separatorIndex = konuOzeti.indexOf(separator);
                if (separatorIndex !== -1) { hafizaTeknigi = konuOzeti.substring(separatorIndex + separator.length).trim(); konuOzeti = konuOzeti.substring(0, separatorIndex).replace("Konu Özeti:", "").trim(); }
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4>`; if (konuOzeti) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`; if (hafizaTeknigi) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`; explanationHTML += `</div>`;
            }
            resultItemDiv.innerHTML = `<p class="font-bold mb-2">Soru ${index + 1}:</p><pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>${this._createResultOptionsHTML(q, userAnswer)}${explanationHTML}`;
            wrongAnswersContainer.appendChild(resultItemDiv);
        });
    }
    renderMarkedQuestions(markedQuestions) {
        const { markedQuestionsContainer } = this.dom; if (!markedQuestionsContainer) return; markedQuestionsContainer.innerHTML = '';
        if (markedQuestions.length === 0) { markedQuestionsContainer.innerHTML = `<p class="text-slate-600 p-4 bg-slate-50 rounded-lg">İncelemek için herhangi bir soru işaretlemediniz.</p>`; return; }
        markedQuestions.forEach(item => {
            const { question: q, index, userAnswer } = item; const resultItemDiv = document.createElement('div'); resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200"; const isCorrect = userAnswer === q.correctAnswer; const statusText = userAnswer ? (isCorrect ? 'Doğru Cevaplandı' : 'Yanlış Cevaplandı') : 'Boş Bırakıldı'; const statusColor = userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-slate-600'; const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');
            let explanationHTML = '';
            if (q.explanation) {
                const separator = "Hafıza Tekniği:"; let konuOzeti = q.explanation; let hafizaTeknigi = "";
                const separatorIndex = konuOzeti.indexOf(separator);
                if (separatorIndex !== -1) { hafizaTeknigi = konuOzeti.substring(separatorIndex + separator.length).trim(); konuOzeti = konuOzeti.substring(0, separatorIndex).replace("Konu Özeti:", "").trim(); }
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4>`; if (konuOzeti) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`; if (hafizaTeknigi) explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`; explanationHTML += `</div>`;
            }
            resultItemDiv.innerHTML = `<div class="flex justify-between items-center mb-2"><p class="font-bold">Soru ${index + 1}:</p><span class="text-sm font-semibold ${statusColor}">${statusText}</span></div><pre class="mb-4 bg-slate-50 p-3 rounded">${cleanQuestionText}</pre>${this._createResultOptionsHTML(q, userAnswer)}${explanationHTML}`;
            markedQuestionsContainer.appendChild(resultItemDiv);
        });
    }
    updateSuccessRateAppearance(percentage) {
        const { successRateBox, successText, performanceSummary } = this.dom; if (!successRateBox || !successText || !performanceSummary) return;
        successRateBox.className = 'p-4 rounded-lg'; successText.className = '';
        if (percentage >= 90) { successRateBox.classList.add('bg-green-100'); successText.classList.add('text-green-800'); performanceSummary.textContent = "Mükemmel! Konulara tamamen hakimsin."; }
        else if (percentage >= 70) { successRateBox.classList.add('bg-green-100'); successText.classList.add('text-green-800'); performanceSummary.textContent = "Harika bir sonuç! Başarın göz dolduruyor."; }
        else if (percentage >= 50) { successRateBox.classList.add('bg-yellow-100'); successText.classList.add('text-yellow-800'); performanceSummary.textContent = "İyi bir başlangıç. Yanlış yaptığın ve işaretlediğin konuları tekrar etmen faydalı olacaktır."; }
        else { successRateBox.classList.add('bg-red-100'); successText.classList.add('text-red-800'); performanceSummary.textContent = "Konuları tekrar gözden geçirmende fayda var. Pes etme!"; }
        successText.textContent = 'Başarı';
    }
    switchResultTab(tabName) {
        const { wrongAnswersPanel, markedQuestionsPanel, wrongAnswersTab, markedQuestionsTab } = this.dom; if (!wrongAnswersPanel || !markedQuestionsPanel || !wrongAnswersTab || !markedQuestionsTab) return;
        const isWrongTab = tabName === 'wrong';
        wrongAnswersPanel.classList.toggle('hidden', !isWrongTab); markedQuestionsPanel.classList.toggle('hidden', isWrongTab);
        wrongAnswersTab.classList.toggle('tab-active', isWrongTab); markedQuestionsTab.classList.toggle('tab-active', !isWrongTab);
    }
    bindQuizEvents() {
        const { nextBtn, prevBtn, markReviewBtn, finishBtn } = this.dom;
        if(nextBtn) nextBtn.addEventListener('click', () => this.examManager.goToNextQuestion());
        if(prevBtn) prevBtn.addEventListener('click', () => this.examManager.goToPrevQuestion());
        if(markReviewBtn) markReviewBtn.addEventListener('click', () => this.examManager.toggleMarkForReview());
        if(finishBtn) finishBtn.addEventListener('click', () => this.examManager.finishQuiz(false));
    }
}
class ModalManager {
    constructor(domElements) { this.dom = domElements; this.bindModalEvents(); }
    bindModalEvents() { if (this.dom.alertModalOkBtn) { this.dom.alertModalOkBtn.addEventListener('click', () => this.hide()); } }
    show(config) {
        const { alertModal, alertModalTitle, alertModalMessage, alertModalOkBtn } = this.dom; if (!alertModal || !alertModalTitle || !alertModalMessage || !alertModalOkBtn) return;
        alertModalTitle.textContent = config.title; alertModalMessage.textContent = config.message;
        alertModal.classList.remove('hidden'); alertModal.classList.add('flex'); alertModalOkBtn.focus();
        alertModalOkBtn.onclick = () => { this.hide(); if (config.onConfirm) config.onConfirm(); };
    }
    hide() { if (this.dom.alertModal) { this.dom.alertModal.classList.remove('flex'); this.dom.alertModal.classList.add('hidden'); } }
}

// Uygulamayı Başlat
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('app-container')) {
        new JusticeExamApp();
    }
});
