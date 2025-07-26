// ===================================================================================
// VERİ & YAPILANDIRMA
// ===================================================================================
// Bu link, soruların çekileceği Google E-Tablosu'nun linkidir.
// Kendi sorularınızı hazırladığınızda bu linki değiştirmeniz yeterlidir.
// Örnek olarak daha önce kullandığımız linki ekliyorum:
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1TLyIqpuCQTkp2JkEUybY4Xc1Ty9rWSBqJ3aQF4j7OOE/export?format=csv&gid=0";

// ===================================================================================
// UYGULAMA MANTIĞI
// ===================================================================================
class JusticeExamApp {
    constructor() {
        this.domElements = this.initializeDOMElements();
        if (!this.domElements.welcomeScreen) { return; } // Eğer sınav sayfasında değilsek çalışma
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
        
        const calculatedDuration = Math.ceil(questionPool.length * 1.5); // Her soru için 1.5 dakika
        
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
        this.domElements.startExamBtn.disabled = true;
        if(this.domElements.startBtnFullText) this.domElements.startBtnFullText.textContent = "HATA OLUŞTU";
        this.domElements.totalQuestionCount.textContent = "0";
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
    // Sınıfın geri kalanı aynı... (Önceki kodlardan)
}
class UIManager {
     // Sınıfın geri kalanı aynı... (Önceki kodlardan)
}
class ModalManager {
     // Sınıfın geri kalanı aynı... (Önceki kodlardan)
}

// Sadece deneme sınavı veya test sayfalarında bu motoru çalıştır.
if (document.getElementById('app-container')) {
    new JusticeExamApp();
}
