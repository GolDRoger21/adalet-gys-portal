// ===================================================================================
// VERİ & YAPILANDIRMA
// ===================================================================================
// Bu link, soruların çekileceği Google E-Tablosu'nun linkidir.
// Kendi sorularınızı hazırladığınızda bu linki değiştirmeniz yeterlidir.
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1TLyIqpuCQTkp2JkEUybY4Xc1Ty9rWSBqJ3aQF4j7OOE/export?format=csv&gid=0";

// ===================================================================================
// UYGULAMA MANTIĞI
// ===================================================================================

class JusticeExamApp {
    constructor() {
        this.domElements = this.initializeDOMElements();
        // Eğer sınav/test için gerekli ana konteyner yoksa, script'in çalışmasını engelle
        if (!this.domElements.welcomeScreen) { 
            console.log("Sınav konteyneri bulunamadı, test motoru başlatılmadı.");
            return; 
        }
        this.examManager = null;
        this.uiManager = null;
        this.modalManager = null;
        this.fetchAndParseSheetData();
    }

    initializeDOMElements() {
        return {
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
        if (!Array.isArray(questionPool) || questionPool.length === 0) { this.showError("Google Sheet'ten soru verisi alınamadı veya format hatalı."); return; }
        
        const calculatedDuration = Math.ceil(questionPool.length * 1.5);
        
        this.domElements.totalQuestionCount.textContent = questionPool.length;
        this.domElements.totalDurationDisplay.innerHTML = `&nbsp;${calculatedDuration} Dakika`;
        this.domElements.startBtnFullText.textContent = `DENEMEYE BAŞLA (${questionPool.length} Soru)`;
        
        this.domElements.startExamBtn.disabled = false;
        
        this.examManager = new ExamManager(questionPool, calculatedDuration, this);
        this.uiManager = new UIManager(this.domElements, this.examManager);
        this.modalManager = new ModalManager(this.domElements);
        this.bindEventListeners();
    }

    showError(message) {
        if (!this.domElements.startExamBtn) return;
        this.domElements.startExamBtn.disabled = true;
        if(this.domElements.startBtnFullText) this.domElements.startBtnFullText.textContent = "HATA OLUŞTU";
        if(this.domElements.totalQuestionCount) this.domElements.totalQuestionCount.textContent = "0";
        if (this.domElements.warningMessage) {
            this.domElements.warningMessage.textContent = message;
            this.domElements.warningBox.classList.remove('hidden');
        }
    }

    bindEventListeners() {
        this.domElements.startExamBtn.addEventListener('click', () => this.startExam());
        this.domElements.restartBtn.addEventListener('click', () => window.location.reload());
        this.domElements.closeResultModalBtn.addEventListener('click', () => window.location.reload());
        
        this.domElements.wrongAnswersTab.addEventListener('click', () => this.uiManager.switchResultTab('wrong'));
        this.domElements.markedQuestionsTab.addEventListener('click', () => this.uiManager.switchResultTab('marked'));
    }

    startExam() {
        this.domElements.welcomeScreen.classList.add('hidden');
        this.domElements.quizScreen.classList.remove('hidden');
        this.examManager.startExam();
    }
    
    robustCsvParse(csvText) {
        const rows = [];
        let currentRow = '';
        let inQuotes = false;
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        for (let i = 0; i < normalizedText.length; i++) {
            const char = normalizedText[i];
            if (char === '"') {
                if (inQuotes && normalizedText[i + 1] === '"') { currentRow += '"'; i++; } 
                else { inQuotes = !inQuotes; }
            }
            if (char === '\n' && !inQuotes) {
                if (currentRow) { rows.push(currentRow); }
                currentRow = '';
            } else { currentRow += char; }
        }
        if (currentRow) { rows.push(currentRow); }
        return rows;
    }

    parseCsvRow(row) {
        const values = []; let currentVal = ''; let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            if (char === '"') { if (inQuotes && row[i + 1] === '"') { currentVal += '"'; i++; } else { inQuotes = !inQuotes; } } 
            else if (char === ',' && !inQuotes) { values.push(currentVal.trim().replace(/^"|"$/g, '')); currentVal = ''; } 
            else { currentVal += char; }
        }
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        return values;
    }

    async fetchAndParseSheetData() {
        if (!GOOGLE_SHEET_URL) { this.showError("Google Sheet linki bulunamadı."); return; }
        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            if (!response.ok) throw new Error(`Ağ yanıtı başarısız: ${response.status}`);
            const csvText = await response.text();
            if (!csvText) { throw new Error("CSV verisi boş."); }
            
            const rows = this.robustCsvParse(csvText);
            if (rows.length < 2) throw new Error("CSV dosyasında yeterli veri bulunamadı.");

            const headers = this.parseCsvRow(rows[0]);
            const required = ['questionText', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'];
            if (required.some(h => !headers.includes(h))) { throw new Error(`Eksik başlıklar: ${required.filter(h => !headers.includes(h)).join(', ')}`); }
            
            const questionPool = rows.slice(1).map(row => {
                if (!row) return null;
                const values = this.parseCsvRow(row);
                if (values.length < headers.length) return null;
                
                const data = headers.reduce((obj, h, i) => { obj[h] = values[i] || ''; return obj; }, {});
                
                return { 
                    questionText: data.questionText, 
                    options: { A: data.optionA, B: data.optionB, C: data.optionC, D: data.optionD, E: data.optionE }, 
                    correctAnswer: data.correctAnswer.trim().toUpperCase(),
                    explanation: data.explanation || ''
                };
            }).filter(q => q && q.questionText && q.correctAnswer);

            if (questionPool.length === 0) { throw new Error("Hiç geçerli soru bulunamadı."); }

            this.initializeApp(questionPool);
        } catch (error) { console.error('Veri çekme hatası:', error); this.showError(`Sorular çekilirken hata: ${error.message}`); }
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
    }

    startExam() {
        this.userAnswers = Array(this.questions.length).fill(null).map(() => ({ userAnswer: null, isMarkedForReview: false }));
        this.timeRemaining = this.durationMinutes * 60;
        this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
        this.app.domElements.quizScreen.classList.remove('hidden');
        this.startTimer();
        this.app.uiManager.renderQuestion();
        this.app.uiManager.bindQuizEvents();
    }
    
    formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    goToNextQuestion() { if (this.currentQuestionIndex < this.questions.length - 1) { this.currentQuestionIndex++; this.app.uiManager.renderQuestion(); } }
    goToPrevQuestion() { if (this.currentQuestionIndex > 0) { this.currentQuestionIndex--; this.app.uiManager.renderQuestion(); } }
    
    selectAnswer(optionKey) {
        this.userAnswers[this.currentQuestionIndex].userAnswer = optionKey;
        this.app.uiManager.renderQuestion();
        if (this.currentQuestionIndex < this.questions.length - 1) { setTimeout(() => { this.goToNextQuestion(); }, 200); }
    }

    toggleMarkForReview() {
        this.userAnswers[this.currentQuestionIndex].isMarkedForReview = !this.userAnswers[this.currentQuestionIndex].isMarkedForReview;
        this.app.uiManager.updateNavPalette();
        this.app.uiManager.updateButtonStates();
    }

    navigateToQuestion(index) { this.currentQuestionIndex = index; this.app.uiManager.renderQuestion(); }
    
    finishQuiz(isAuto = false) {
        if (isAuto) { this.performFinish(); } 
        else { this.app.modalManager.show({ title: 'Sınavı Bitir', message: 'Sınavı bitirmek istediğinizden emin misiniz?', onConfirm: () => this.performFinish() }); }
    }

    performFinish() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        document.removeEventListener('visibilitychange', this.handleVisibilityChange);

        let correct = 0, incorrect = 0, empty = 0;
        const incorrectQuestions = [];
        const markedQuestions = [];
        
        this.questions.forEach((q, i) => {
            const userAnswerData = this.userAnswers[i];
            if (userAnswerData.isMarkedForReview) {
                markedQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer });
            }

            if (!userAnswerData.userAnswer) { empty++; } 
            else if (userAnswerData.userAnswer === q.correctAnswer) { correct++; } 
            else { incorrect++; incorrectQuestions.push({ question: q, index: i, userAnswer: userAnswerData.userAnswer }); }
        });

        const totalQuestions = this.questions.length;
        const successPercentage = totalQuestions > 0 ? (correct / totalQuestions * 100) : 0;

        this.app.domElements.correctCount.textContent = correct;
        this.app.domElements.incorrectCount.textContent = incorrect;
        this.app.domElements.emptyCount.textContent = empty;
        this.app.domElements.successRate.textContent = `${successPercentage.toFixed(1)}%`;
        this.app.uiManager.updateSuccessRateAppearance(successPercentage);
        
        this.app.domElements.quizScreen.classList.add('hidden');
        this.app.domElements.resultModal.classList.remove('hidden');
        this.app.domElements.resultModal.focus();

        this.app.uiManager.renderResultsPage(incorrectQuestions, markedQuestions);
    }
    
    handleVisibilityChange = () => {
        if (document.hidden) {
            this.app.modalManager.show({
                title: 'UYARI',
                message: 'Sınav sırasında başka bir sekmeye geçtiniz. Lütfen sınava odaklanın.'
            });
        }
    }

    startTimer() {
        document.addEventListener('visibilitychange', this.handleVisibilityChange);
        const totalDuration = this.durationMinutes * 60;
        this.app.domElements.remainingTime.classList.remove('timer-warning');
        
        this.timerInterval = setInterval(() => {
            if (this.timeRemaining <= 0) { clearInterval(this.timerInterval); this.finishQuiz(true); return; }
            this.timeRemaining--;
            
            this.app.domElements.remainingTime.textContent = this.formatTime(this.timeRemaining);
            
            const elapsedSecondsTotal = totalDuration - this.timeRemaining;
            this.app.domElements.elapsedTime.textContent = this.formatTime(elapsedSecondsTotal);

            if (this.timeRemaining <= 300 && !this.app.domElements.remainingTime.classList.contains('timer-warning')) {
                this.app.domElements.remainingTime.classList.add('timer-warning');
                this.app.domElements.timerAnnouncer.textContent = 'Sınavın bitmesine son 5 dakika kaldı.';
            }
        }, 1000);
    }
}

class UIManager {
    constructor(domElements, examManager) {
        this.dom = domElements;
        this.examManager = examManager;
    }

    renderQuestion() {
        const question = this.examManager.questions[this.examManager.currentQuestionIndex];
        this.dom.counter.textContent = `Soru ${this.examManager.currentQuestionIndex + 1} / ${this.examManager.questions.length}`;
        const cleanQuestionText = question.questionText.replace(/^\d+[\.\)-]\s*/, '');
        this.dom.questionText.textContent = cleanQuestionText;
        this.dom.optionsContainer.innerHTML = '';
        Object.entries(question.options).forEach(([key, optionText]) => {
            if (optionText) { const button = this.createOptionButton(key, optionText); this.dom.optionsContainer.appendChild(button); }
        });
        this.updateNavPalette();
        this.updateButtonStates();
    }

    createOptionButton(key, optionText) {
        const button = document.createElement('button');
        const isSelected = this.examManager.userAnswers[this.examManager.currentQuestionIndex].userAnswer === key;
        
        button.className = 'option-btn flex items-center w-full text-left p-4 rounded-lg';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', isSelected ? 'true' : 'false');
        button.innerHTML = `<span class="option-key flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full border font-bold mr-4">${key}</span><span class="text-justify w-full">${optionText}</span>`;
        
        if (isSelected) { 
            button.classList.add('option-selected'); 
        }

        button.onclick = () => { this.examManager.selectAnswer(key); };
        return button;
    }

    updateNavPalette() {
        this.dom.navPalette.innerHTML = '';
        this.examManager.questions.forEach((_, index) => {
            const box = document.createElement('button');
            box.textContent = index + 1;
            box.setAttribute('aria-label', `Soru ${index + 1}'ye git`);
            let statusClass = ' bg-slate-300 hover:bg-slate-400';
            if (this.examManager.userAnswers[index].isMarkedForReview) { statusClass = ' bg-yellow-400 text-white hover:bg-yellow-500'; } 
            else if (this.examManager.userAnswers[index].userAnswer) { statusClass = ' bg-green-500 text-white hover:bg-green-600'; }
            let ringClass = index === this.examManager.currentQuestionIndex ? ' ring-4 ring-offset-2 ring-teal-500 scale-110 z-10' : '';
            box.className = `nav-box w-full h-10 flex items-center justify-center rounded-md border border-transparent${statusClass}${ringClass}`;
            box.onclick = () => { this.examManager.navigateToQuestion(index); };
            this.dom.navPalette.appendChild(box);
        });
    }

    updateButtonStates() {
        this.dom.prevBtn.disabled = this.examManager.currentQuestionIndex === 0;
        this.dom.nextBtn.disabled = this.examManager.currentQuestionIndex === this.examManager.questions.length - 1;
        const isMarked = this.examManager.userAnswers[this.examManager.currentQuestionIndex].isMarkedForReview;
        this.dom.markReviewBtn.classList.toggle('marked', isMarked);
        this.dom.flagOutlineIcon.classList.toggle('hidden', isMarked);
        this.dom.flagSolidIcon.classList.toggle('hidden', !isMarked);
    }

    renderResultsPage(incorrectQuestions, markedQuestions) {
        this.renderWrongAnswers(incorrectQuestions);
        this.renderMarkedQuestions(markedQuestions);
    }

    _createResultOptionsHTML(q, userAnswer) {
        let optionsHTML = '<div class="space-y-2 mt-4 text-sm">';
        for (const [key, text] of Object.entries(q.options)) {
            if (!text) continue;

            let classes = 'border-slate-200 bg-slate-50 text-slate-700';
            let icon = `<span class="font-bold text-slate-500">${key})</span>`;

            if (key === q.correctAnswer) {
                classes = 'border-green-400 bg-green-50 text-green-800 font-medium';
                icon = `<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            } else if (key === userAnswer) {
                classes = 'border-red-400 bg-red-50 text-red-800 font-medium';
                icon = `<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            }

            optionsHTML += `
                <div class="flex items-start p-3 rounded-lg border ${classes}">
                    <div class="flex-shrink-0 w-5 h-5 mr-3">${icon}</div>
                    <p class="text-justify flex-1">${text}</p>
                </div>
            `;
        }
        optionsHTML += '</div>';
        return optionsHTML;
    }

    renderWrongAnswers(incorrectQuestions) {
        const container = this.dom.wrongAnswersContainer;
        container.innerHTML = '';

        if (incorrectQuestions.length === 0) {
            container.innerHTML = `<p class="text-green-600 p-4 bg-green-50 rounded-lg">Tebrikler! Yanlış cevabınız bulunmuyor.</p>`;
            return;
        }

        incorrectQuestions.forEach((item) => {
            const q = item.question;
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200";
            
            const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');
            
            let explanationHTML = '';
            if (q.explanation) {
                const separator = "Hafıza Tekniği:";
                let konuOzeti = q.explanation;
                let hafizaTeknigi = "";
                const separatorIndex = konuOzeti.indexOf(separator);
                if (separatorIndex !== -1) {
                    hafizaTeknigi = konuOzeti.substring(separatorIndex + separator.length).trim();
                    konuOzeti = konuOzeti.substring(0, separatorIndex).replace("Konu Özeti:", "").trim();
                }
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4><div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`;
                if(hafizaTeknigi) {
                    explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`;
                }
                explanationHTML += `</div>`;
            }

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
        container.innerHTML = '';

        if (markedQuestions.length === 0) {
            container.innerHTML = `<p class="text-slate-600 p-4 bg-slate-50 rounded-lg">İncelemek için herhangi bir soru işaretlemediniz.</p>`;
            return;
        }

        markedQuestions.forEach((item) => {
            const q = item.question;
            const resultItemDiv = document.createElement('div');
            resultItemDiv.className = "mb-6 p-4 bg-white rounded-lg border border-slate-200";
            
            const isCorrect = item.userAnswer === q.correctAnswer;
            const statusText = item.userAnswer ? (isCorrect ? 'Doğru Cevaplandı' : 'Yanlış Cevaplandı') : 'Boş Bırakıldı';
            const statusColor = item.userAnswer ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-slate-600';
            const cleanQuestionText = q.questionText.replace(/^\d+[\.\)-]\s*/, '');

            let explanationHTML = '';
            if (q.explanation) {
                const separator = "Hafıza Tekniği:";
                let konuOzeti = q.explanation;
                let hafizaTeknigi = "";
                const separatorIndex = konuOzeti.indexOf(separator);
                if (separatorIndex !== -1) {
                    hafizaTeknigi = konuOzeti.substring(separatorIndex + separator.length).trim();
                    konuOzeti = konuOzeti.substring(0, separatorIndex).replace("Konu Özeti:", "").trim();
                }
                explanationHTML = `<div class="explanation-box"><h4>Soru Analizi</h4><div class="explanation-section"><h5><span class="mr-2">📖</span><span>Konu Özeti</span></h5><p>${konuOzeti}</p></div>`;
                if(hafizaTeknigi) {
                    explanationHTML += `<div class="explanation-section"><h5><span class="mr-2">💡</span><span>Hafıza Tekniği</span></h5><p>${hafizaTeknigi}</p></div>`;
                }
                explanationHTML += `</div>`;
            }

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

        box.className = 'p-4 rounded-lg'; text.className = '';
        if (percentage >= 90) { 
            box.classList.add('bg-green-100'); text.classList.add('text-green-800');
            summary.textContent = "Mükemmel! Konulara tamamen hakimsin.";
        } else if (percentage >= 70) { 
            box.classList.add('bg-green-100'); text.classList.add('text-green-800');
            summary.textContent = "Harika bir sonuç! Başarın göz dolduruyor.";
        } else if (percentage >= 50) { 
            box.classList.add('bg-yellow-100'); text.classList.add('text-yellow-800');
            summary.textContent = "İyi bir başlangıç. Yanlış yaptığın ve işaretlediğin konuları tekrar etmen faydalı olacaktır.";
        } else { 
            box.classList.add('bg-red-100'); text.classList.add('text-red-800');
            summary.textContent = "Konuları tekrar gözden geçirmende fayda var. Pes etme!";
        }
        text.textContent = 'Başarı';
    }

    switchResultTab(tabName) {
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

    bindQuizEvents() {
        this.dom.nextBtn.addEventListener('click', () => { this.examManager.goToNextQuestion(); });
        this.dom.prevBtn.addEventListener('click', () => { this.examManager.goToPrevQuestion(); });
        this.dom.markReviewBtn.addEventListener('click', () => { this.examManager.toggleMarkForReview(); });
        this.dom.finishBtn.addEventListener('click', () => { this.examManager.finishQuiz(false); });
    }
}

class ModalManager {
    constructor(domElements) { this.dom = domElements; this.bindModalEvents(); }
    bindModalEvents() { this.dom.alertModalOkBtn.addEventListener('click', () => this.hide()); }
    
    show(config) {
        this.dom.alertModalTitle.textContent = config.title;
        this.dom.alertModalMessage.textContent = config.message;
        this.dom.alertModal.classList.remove('hidden');
        this.dom.alertModal.classList.add('flex');
        this.dom.alertModalOkBtn.focus();
         this.dom.alertModalOkBtn.onclick = () => {
            this.hide();
            if (config.onConfirm) {
                config.onConfirm();
            }
        };
    }

    hide() {
        this.dom.alertModal.classList.add('hidden');
        this.dom.alertModal.classList.remove('flex');
    }
}


// Sadece deneme sınavı veya test sayfalarında bu motoru çalıştır.
// Bunu yapmak için HTML'de ana bir konteyner ID'si olup olmadığını kontrol eder.
if (document.getElementById('app-container')) {
    new JusticeExamApp();
}
