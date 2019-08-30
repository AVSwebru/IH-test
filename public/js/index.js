const animateIn = "fadeInUp",
    animateOut = "fadeOutUp",
    animationWait = 200;
const userTimer = 20000;

function animateCSS(element, animationName, delay, callback) {
    const node = element;
    node.classList.add('animated', animationName, delay);

    function handleAnimationEnd() {
        node.classList.remove('animated', animationName, delay);
        node.removeEventListener('animationend', handleAnimationEnd);

        if (typeof callback === 'function') callback();

    }

    node.addEventListener('animationend', handleAnimationEnd);
}

let userTimeout;
let loaderPixelPercent = 21;
let isAlone = document.querySelector(".isAlone");
let resultNode = document.querySelector(".result__panel").cloneNode(true);
document.querySelector(".result__panel").remove();
let askImg = document.querySelector(".ask-img");
let askTitle = document.querySelector(".ask-title");
let block = document.querySelector(".block");
let questionNumberBox = document.querySelector(".question__number");
let currentQuestion = document.querySelector(".question__number-current");
let countQuestions = document.querySelector(".question__number-all");
let progressBar = document.querySelector(".question__number-progress");
let answerBox = document.querySelector(".answer-box");
let btnSection = document.querySelector(".btn-section");
let inputBox = document.querySelector(".input-box");
let submitInputBox = document.querySelector(".submit-input");
let ask = document.querySelector(".ask");
let loader = document.querySelector("#loader");
let answer = document.querySelectorAll(".answer");
let inputText = document.querySelector(".response_input");
let imgFormData = new FormData();
let userDataPanel = document.querySelector(".last__show form");
let userDataPanelSubmit = document.querySelector(".last__show-submit");
let nullCounter = 0;
let state = [];


/*

Запуск текстовых анимаций.
Задаются необходимые высоты и прозрачность

*/
let textAnimationStart = (temp = null) => {
    let delay;
    (temp === null) ? delay = 0 : delay = temp;
    animateCSS(ask, animateIn, `${delay === 0 ? "faster" : "delay-1s"}`, appender(ask));
    animateCSS(answerBox, animateIn, `${delay === 0 ? "fast" : "delay-15s"}`, appender(answerBox));
    animateCSS(askImg, animateIn, "fast", appender(askImg));
    animateCSS(askTitle, animateIn, "fast", appender(askTitle));
    let cloneLoader = loader.cloneNode(true);
    loader.parentNode.replaceChild(cloneLoader, loader);
    loader = cloneLoader;
    if (state.length > 1) {
        animateCSS(btnSection, animateIn, `${delay === 0 ? "fast" : "delay-2s"}`, appender(btnSection));
    }
    answerBox.style.maxHeight = "100%";
    // answerBox.style.padding = "30px 0 0";
    submitInputBox.style.display = "none";
};

/*
    В данном тесте не используется, предназначена для анимирования и вывода полей ввода
    Создаются все необходимые поля ввода.
*/
let inputAnimationStart = (question, submitBtnShow = true) => {
    let type = question.type_input;
    inputBox.querySelector(".response_input").remove();
    if (inputBox.querySelector(".file-label") !== null) inputBox.querySelector(".file-label").remove();
    if (inputBox.querySelector(".preview") !== null) inputBox.querySelector(".preview").remove();
    let newInput;
    switch (type) {
        case 'textarea':
            newInput = document.createElement("textarea");
            newInput.setAttribute("rows", "4");
            newInput.classList.add("response_input");
            newInput.setAttribute("required", "");
            break;
        case 'date':
            newInput = document.createElement("select");
            for (let i = 0; i < 20; i++) {
                let newOpt = document.createElement("option");
                newOpt.setAttribute("value", 2000 + i);
                newOpt.innerHTML = newOpt.getAttribute("value");
                newInput.appendChild(newOpt);
            }
            newInput.classList.add("response_input");
            newInput.setAttribute("required", "");
            break;
        case 'file':
            let preview = document.createElement("div");
            newInput = document.createElement("label");
            preview.classList.add("preview");
            inputBox.appendChild(preview);
            let newLabel = document.createElement("label");
            newLabel.classList.add("file-label");
            newLabel.innerHTML = `<img src="./img/gallery.svg" alt="gallery">Прикрепите фото`;
            newLabel.setAttribute("for", "fileinput");
            let newInputFile = document.createElement("input");
            newInputFile.setAttribute("type", "file");
            newInputFile.setAttribute("id", "fileinput");
            newInputFile.setAttribute("multiple", "");
            newInputFile.setAttribute("accept", "image/*,image/jpeg");
            newInputFile.classList.add("response_input");
            newInputFile.addEventListener("change", showPreview);
            newLabel.appendChild(newInputFile);
            newInput.appendChild(preview);
            newInput.appendChild(newLabel);
            break;
        default:
            newInput = document.createElement("input");
            newInput.setAttribute("type", "text");
            newInput.classList.add("response_input");
            newInput.setAttribute("required", "");
    }
    if (type !== ("file" && "date")) {
        newInput.addEventListener('keydown', function (e) {
            const { keyCode } = e;
            if (keyCode === 13) {
                submitInputBoxListener();
            }
        });
        if (question.userAnswer) {
            newInput.value = question.userAnswer;
        }
    }
    inputBox.appendChild(newInput);
    if (type !== ("file" && "date")) newInput.focus();
    animateCSS(ask, animateIn, "faster", appender(ask));
    animateCSS(inputBox, animateIn, "fast", appender(inputBox));
    if (state.length > 1) {
        animateCSS(btnSection, animateIn, "fast", appender(btnSection));
    }

    if (submitBtnShow) {
        submitInputBox.style.display = "";
    } else {
        submitInputBox.style.display = "none";
    }

    inputBox.style.maxHeight = "100%";
    inputBox.style.padding = "30px 0 0";
};

/*
    Предназначен для анимации Out для полей ввода и обычных вопросов
*/
let textAnimationOut = () => {
    animateCSS(ask, animateOut, "faster", remover(ask));
    animateCSS(answerBox, animateOut, "fast", remover(answerBox));
    animateCSS(btnSection, animateOut, "fast", remover(btnSection));
    animateCSS(askImg, animateOut, "fast", remover(askImg));
    animateCSS(askTitle, animateOut, "fast", remover(askTitle));
};

let inputAnimationOut = () => {
    animateCSS(ask, animateOut, "faster", remover(ask));
    animateCSS(inputBox, animateOut, "fast", remover(inputBox));
    animateCSS(btnSection, animateOut, "fast", remover(btnSection));
};

// wait preview question

/* 
    Кнопка старта теста, появление необходимых элементов и изменение сетки для перевода ее на вопросы, анимация входа для полей loader и номеров вопроса
*/
document.querySelector(".start-test").addEventListener("click", () => {

    //stat
    yaCounter29913264.reachGoal('third_step');
    gtag('event', 'third_step', { 'event_category': 'button', 'event_label': 'begin' });
    //

    animateCSS(ask, animateOut, "fast", remover(ask));
    animateCSS(document.querySelector(".start-test"), animateOut, "fast", remover(document.querySelector(".start-test")));
    ask.classList.remove("delay-1s");
    setTimeout(() => {
        document.querySelector(".content").style.gridTemplateColumns = "425px 7fr";
        document.querySelector(".content").style.gridGap = "0 70px";
        document.querySelector(".ask-content").style.textAlign = "left";
        document.querySelector(".ask-content").style.gridTemplateRows = "0.3fr 0.4fr 1fr";
        document.querySelector(".ask-img").style.width = "100%";
        document.querySelector(".ask-img").style.textAlign = "right";
        getQuestion();
        animateCSS(loader, animateIn, "fast", appender(loader));
        animateCSS(questionNumberBox, animateIn, "faster", appender(questionNumberBox));
    }, animationWait);
});

//
/*
    remover и appender колбеки для удаления и соответственно задания высот и прозрачностей при анимациях
*/
function remover(elem) {
    setTimeout(() => {
        elem.style.opacity = 0;
        elem.maxHeight = 0;
    }, 100);
    inputBox.style.padding = "0";
    inputBox.style.maxHeight = "0";
    answerBox.style.maxHeight = "0";
    answerBox.style.padding = "0";
}

function appender(elem) {
    elem.style.opacity = 1;
    elem.style.maxHeight = "100%";
}

inputBox.addEventListener('input', function (event) {
    if (event.keyCode == 13) {
        event.preventDefault();
    }
});


/*
    Задание обработчиков для клика на какой либо из ответов.
*/
answer.forEach((el, index) => {
    el.addEventListener("click", (e) => {
        //statistic
        if (index === 0 && nullCounter === 0) {
            yaCounter29913264.reachGoal('1varian_fav');
            gtag('event', 'favourite', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 0) {
            yaCounter29913264.reachGoal('2varian_fav');
            gtag('event', 'favourite', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 1) {
            yaCounter29913264.reachGoal('1varian_fev');
            gtag('event', 'fever', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 1) {
            yaCounter29913264.reachGoal('2varian_fev');
            gtag('event', 'fever', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 2) {
            yaCounter29913264.reachGoal('1varian_hir');
            gtag('event', 'hir', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 2) {
            yaCounter29913264.reachGoal('2varian_hir');
            gtag('event', 'hir', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 3) {
            yaCounter29913264.reachGoal('1varian_gob');
            gtag('event', 'gobbleolygook', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 3) {
            yaCounter29913264.reachGoal('2varian_gob');
            gtag('event', 'gobbleolygook', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 4) {
            yaCounter29913264.reachGoal('1varian_pre');
            gtag('event', 'presser', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 4) {
            yaCounter29913264.reachGoal('2varian_pre');
            gtag('event', 'presser', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 5) {
            yaCounter29913264.reachGoal('1varian_chi');
            gtag('event', 'chipmunnky', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 5) {
            yaCounter29913264.reachGoal('2varian_chi');
            gtag('event', 'chipmunnky', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 6) {
            yaCounter29913264.reachGoal('1varian_peo');
            gtag('event', 'peoplekind', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 6) {
            yaCounter29913264.reachGoal('2varian_peo');
            gtag('event', 'peoplekind', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 7) {
            yaCounter29913264.reachGoal('1varian_tra');
            gtag('event', 'translingual', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 7) {
            yaCounter29913264.reachGoal('2varian_tra');
            gtag('event', 'translingual', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 8) {
            yaCounter29913264.reachGoal('1varian_eek');
            gtag('event', 'eeksie-peeksie', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 8) {
            yaCounter29913264.reachGoal('2varian_eek');
            gtag('event', 'eeksie-peeksie', { 'event_category': 'question', 'event_label': '2_variant' });
        } else if (index === 0 && nullCounter === 9) {
            yaCounter29913264.reachGoal('1varian_bro');
            gtag('event', 'brown', { 'event_category': 'question', 'event_label': '1_variant' });
        } else if (index === 1 && nullCounter === 9) {
            yaCounter29913264.reachGoal('2varian_bro');
            gtag('event', 'brown', { 'event_category': 'question', 'event_label': '2_variant' });
        }
        //
        clearTimeout(userTimeout);
        answerEventClick(e, el.innerHTML);
    });
});
/* 
В данном тесте не используется предназначен для отправки данных из полей ввода 
*/
submitInputBox.addEventListener("click", function (e) {
    e.preventDefault();
    window.scrollTo(0, 0);
    submitInputBoxListener();
});

/*
    Получение вопроса из БД, принимает данные для отправки на сервер, отправка файла не используется, происходит отправка ответа на вопрос и передача ответа в showRequestAnswer для 
    вывода следующих данных
*/
async function getQuestion(answer = null, type = null, isFile = false, userAnswer = null) {
    if (isFile === true) {
        let xhttpFile = new XMLHttpRequest();
        xhttpFile.open("POST", "/test/public/api/quest", true);

        let fileData = answer;
        fileData.append("isFile", isFile);
        fileData.append("type", type);
        fileData.append("nullQuestion", nullCounter);
        fileData.append("ask", state[state.length - 1].ask);

        await xhttpFile.send(fileData);

        xhttpFile.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let question = JSON.parse(xhttpFile.responseText);
                showRequestAnswer(question, userAnswer);
            }
        };
    } else {
        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", "/test/public/api/quest", true);
        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

        let input = {};
        if (type === "input" || type === null) {
            input = JSON.stringify({
                "nullQuestion": nullCounter,
                "answer": answer,
                "type": type,
                "isFile": isFile,
                "ask": (state.length) ? state[state.length - 1].ask : null
            });
        } else {
            input = JSON.stringify({
                "type": type,
                "answer": answer,
                "nullQuestion": nullCounter,
                "isFile": isFile,
                "ask": (state.length) ? state[state.length - 1].ask : null
            });
        }
        await xhttp.send(input);
        xhttp.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                let question = JSON.parse(xhttp.responseText);
                showRequestAnswer(question, userAnswer);
            }
        };
    }
}

/*
    Обработчик клика для ответов
*/
function answerEventClick(e, content) {
    if (+currentQuestion.innerHTML + 1 <= +countQuestions.innerHTML) {
        currentQuestion.innerHTML = +currentQuestion.innerHTML + 1;
        progressBar.style.width = `${+currentQuestion.innerHTML * loaderPixelPercent}px`;
    }
    textAnimationOut();
    setTimeout(() => {
        getQuestion(content, "text");
    }, animationWait);

    e.target.removeEventListener("click", answerEventClick);
}
/*
    Обработчик клика для полей ввода
*/
function submitInputBoxListener() {
    //statistic
    //

    inputText = document.querySelector(".response_input");
    if (!validate(inputText)) {
        return;
    }
    if (+currentQuestion.innerHTML + 1 <= +countQuestions.innerHTML) {
        currentQuestion.innerHTML = +currentQuestion.innerHTML + 1;
        progressBar.style.width = `${+currentQuestion.innerHTML * loaderPixelPercent}px`;
    }
    inputAnimationOut();
    inputText = document.querySelector(".response_input");
    let userAnswer = "";
    let isFile = false;
    let inputVal = inputText.value;
    if (inputText.hasAttribute("type") && inputText.getAttribute("type") === "file") {
        isFile = true;

        if (imgFormData.get("answer[]")) {
            inputVal = imgFormData;
        } else {
            inputVal = new FormData();
        }
    }
    if (inputText.hasAttribute("type") && inputText.getAttribute("type") === "text" || inputText.tagName.toLowerCase() === "textarea") {
        userAnswer = inputText.value;
    }


    setTimeout(() => {
        getQuestion(inputVal, "input", isFile, userAnswer);
    }, animationWait);

    submitInputBox.removeEventListener("click", submitInputBoxListener);
}

/*
   Вывод данных о следующем вопросе
*/
async function showRequestAnswer(question, userAnswer = null) {
    (question.nullQuestion === 0) ? nullCounter = 1 : question.nullQuestion === null ? nullCounter : nullCounter = question.nullQuestion;
    ask.innerHTML = question.ask.split("\n").join(`<br>`);
    state.push(question);
    if (userAnswer) {
        state[state.length - 2].userAnswer = userAnswer;
    }
    userTimeout = setTimeout(() => {
        getQuestion(null, "text", false, null);
        if (+currentQuestion.innerHTML + 1 <= +countQuestions.innerHTML) {
            currentQuestion.innerHTML = +currentQuestion.innerHTML + 1;
            progressBar.style.width = `${+currentQuestion.innerHTML * loaderPixelPercent}px`;
        }
    }, userTimer);
    if (question.type === "text") {
        if (question.ask == "LAST_RESPONSE") {
            if (question.isTeammate) {
                document.querySelectorAll('.last__show .form-group')[1].remove();
                document.querySelector(".name").parentNode.style.display = "none";
                document.querySelector(".surname").parentNode.style.display = "none";
                document.querySelector(".phone").parentNode.style.display = "none";
                document.querySelector('.form-content').style.gridTemplateColumns = "1fr";
                document.querySelector('.form-content').style.justifyItems = "center";
                document.querySelector('.form-group__title').remove();
            }
            document.querySelector(".content").style.maxHeight = "0";
            loader.style.opacity = 0;
            loader.style.maxHeight = 0;
            animateCSS(ask, animateOut, "faster", remover(ask));
            animateCSS(askImg, animateOut, "faster", remover(askImg));
            document.querySelector(".ask-img").remove();
            document.querySelector(".ask-content").remove();
            document.querySelector('.question__number').remove();
            answerBox.remove();
            animateCSS(askTitle, animateOut, "faster", remover(askTitle));
            animateCSS(answerBox, animateOut, "fast", remover(answerBox));
            let lastShow = document.querySelector(".last__show");
            lastShow.style.display = "block";
            animateCSS(lastShow, animateIn, "faster", appender(lastShow));
            clearTimeout(userTimeout);
        } else if (question.answer) {
            question.answer.forEach(function (el, index) {
                document.querySelectorAll(".answer")[index].innerHTML = el;
            });
            askImg.style.background = `url(../img/files/${question.img}) no-repeat right`;
            setTimeout(textAnimationStart, animationWait);
        } else {
            setTimeout(() => {
                animateCSS(ask, animateIn, "faster", appender(ask));
                animateCSS(btnSection, animateIn, "fast", appender(btnSection));
                submitInputBox.style.display = "none";
            }, animationWait);
        }
    } else {
        let showSubmitBtn = true;
        if (+currentQuestion.innerHTML === +countQuestions.innerHTML) {
            let lastButton = document.createElement("button");
            lastButton.classList.add("btn", "btn-custom", "btn-success", "send-btn");
            lastButton.innerHTML = "Отправить";
            lastButton.addEventListener("click", sendUsersAnswers);
            btnSection.insertBefore(lastButton, submitInputBox);
            showSubmitBtn = false;
        } else {
            if (btnSection.querySelector(".send-btn")) {
                btnSection.querySelector(".send-btn").remove();
            }
        }
        setTimeout(() => {
            inputAnimationStart(question, showSubmitBtn);
        }, 200);
    }
}
/*
    В случае если пользователь проходит один input получают соответствующие стили
*/
isAlone.addEventListener("click", () => {
    if (isAlone.checked) {
        document.querySelector(".teammate_name").setAttribute("disabled", "disabled");
        document.querySelector(".teammate_surname").setAttribute("disabled", "disabled");
        document.querySelector(".teammate_phone").setAttribute("disabled", "disabled");
        document.querySelector(".teammate_status").setAttribute("disabled", "disabled");
        document.querySelector(".teammate_name").setAttribute("readonly", "readonly");
        document.querySelector(".teammate_surname").setAttribute("readonly", "readonly");
        document.querySelector(".teammate_phone").setAttribute("readonly", "readonly");
        document.querySelector(".teammate_status").setAttribute("readonly", "readonly");
        document.querySelector(".teammate_name").style.background = "#eee";
        document.querySelector(".teammate_surname").style.background = "#eee";
        document.querySelector(".teammate_phone").style.background = "#eee";
    } else {
        document.querySelector(".teammate_name").removeAttribute("disabled");
        document.querySelector(".teammate_surname").removeAttribute("disabled");
        document.querySelector(".teammate_phone").removeAttribute("disabled");
        document.querySelector(".teammate_status").removeAttribute("disabled");
        document.querySelector(".teammate_name").removeAttribute("readonly");
        document.querySelector(".teammate_surname").removeAttribute("readonly");
        document.querySelector(".teammate_phone").removeAttribute("readonly");
        document.querySelector(".teammate_status").removeAttribute("readonly");
        document.querySelector(".teammate_name").style.background = "#fff";
        document.querySelector(".teammate_surname").style.background = "#fff";
        document.querySelector(".teammate_phone").style.background = "#fff";
    }
});

/*
    Отправка данных пользователя и его сокомандника
*/
userDataPanelSubmit.addEventListener("click", (e) => {
    e.preventDefault();
    block.appendChild(resultNode);
    let input;
    if (document.querySelectorAll('.last__show .form-group').length === 2) {
        let username = document.querySelector(".name").value;
        let usersurname = document.querySelector(".surname").value;
        let userEmail = document.querySelector(".email").value;
        let userPhone = document.querySelector(".phone").value;
        let userTeammateName = document.querySelector(".teammate_name").value;
        let userTeammateSurname = document.querySelector(".teammate_surname").value;
        let userTeammatePhone = document.querySelector(".teammate_phone").value;
        let userTeammateStatus = document.querySelector(".teammate_status").value;

        input = JSON.stringify({
            username,
            usersurname,
            userEmail,
            userPhone,
            userTeammateName,
            userTeammateSurname,
            userTeammatePhone,
            userTeammateStatus,
            "isAlone": isAlone.checked,
        });
    } else {
        let userEmail = document.querySelector(".email").value;

        input = JSON.stringify({
            userEmail,
        });
    }

    let userDataRequest = new XMLHttpRequest();
    userDataRequest.open("POST", "/test/public/api/userdata", true);
    userDataRequest.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    userDataRequest.send(input);
    userDataRequest.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            yaCounter29913264.reachGoal('success_test');
            gtag('event', 'success_test', { 'event_category': 'button', 'event_label': 'form' });
            document.querySelector('.content').remove();
            loader.remove();
            let answerPercent = JSON.parse(userDataRequest.responseText);
            if (answerPercent.error) {
                document.querySelector(".result__panel span").innerHTML = "Данный email уже зарегистрирован";
            } else {
                document.querySelector(".result__link").innerHTML = "Ссылка для партнера: <br>" + answerPercent.userLink;
                document.querySelector(".result__panel-percent").innerHTML = `${answerPercent.answerScore} баллов`
            }
            animateCSS(document.querySelector(".last__show"), animateOut, "faster", remover(document.querySelector(".last__show")));
            document.querySelector(".last__show").style.maxHeight = 0;
            document.querySelector('.last__show').remove();
            animateCSS(document.querySelector(".result__panel"), animateIn, "faster", appender(document.querySelector(".result__panel")));
        }
    };
});

/*
    Дизайнерские приколы)
*/
document.querySelector(".teammate_status").addEventListener("change", () => {
    document.querySelector(".teammate_status").style.color = "#202020";
});

/*
    Валидация и отправка пользовательских ответов, не используется
*/
let sendUsersAnswers = () => {
    //statistic
    //
    inputText = document.querySelector(".response_input");
    if (!validate(inputText)) {
        return;
    }
    if (+currentQuestion.innerHTML + 1 <= +countQuestions.innerHTML) {
        currentQuestion.innerHTML = +currentQuestion.innerHTML + 1;
        progressBar.style.width = `${+currentQuestion.innerHTML * loaderPixelPercent}px`;
    }
    inputAnimationOut();
    inputText = document.querySelector(".response_input");
    let userAnswer = "";
    let isFile = false;
    let inputVal = inputText.value;
    if (inputText.hasAttribute("type") && inputText.getAttribute("type") === "file") {
        isFile = true;

        if (imgFormData.get("answer[]")) {
            inputVal = imgFormData;
        } else {
            inputVal = new FormData();
        }
    }
    if (inputText.hasAttribute("type") && inputText.getAttribute("type") === "text" || inputText.tagName.toLowerCase() === "textarea") {
        userAnswer = inputText.value;
    }

    setTimeout(() => {
        getQuestion(inputVal, "input", isFile, userAnswer);
    }, animationWait);

    document.querySelector(".send-btn").removeEventListener("click", sendUsersAnswers);
};

function validate(el) {
    if (el.hasAttribute("type") && el.getAttribute("type") === "file") {
        return true;
    }
    if (el.value === "") {
        document.querySelector(".error-msg").innerHTML = "Поле не может быть пустым!";
        return false;
    } else {
        document.querySelector(".error-msg").innerHTML = "";
        return true;
    }
}

/*
    Предназначена для показа превью загружаемых пользователем изовбражений, не используется
*/
function showPreview() {

    let preview = document.querySelector('.preview');

    if (this.files) {
        [].forEach.call(this.files, readAndPreview);
    }

    function readAndPreview(file) {

        // Make sure `file.name` matches our extensions criteria
        if (!/\.(jpe?g|png|gif)$/i.test(file.name)) {
            return alert(file.name + " is not an image");
        } // else...
        var reader = new FileReader();

        reader.addEventListener("load", function () {
            let imgWrapper = document.createElement("div");
            imgWrapper.classList.add("preview__wrapper");
            let image = document.createElement("img");
            image.title = file.name;
            image.src = this.result;
            image.classList.add("preview__img");
            imgWrapper.appendChild(image);
            preview.appendChild(imgWrapper);
        });
        imgFormData.append("answer[]", file);
        reader.readAsDataURL(file);

    }
}