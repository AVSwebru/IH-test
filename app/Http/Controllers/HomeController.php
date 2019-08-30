<?php

namespace App\Http\Controllers;

use App\Question;
use App\Answer;
use App\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use Illuminate\Cookie\CookieJar;

class HomeController extends Controller
{

    protected $token;
    protected $userCookie;

    private const LAST_RESPONSE = array(
        'code' => 200,
        'ask' => "LAST_RESPONSE",
        'type' => "text",
        "nullQuestion" => null,
        'isTeammate' => false
    );

    public function getUserData(Request $request)
    {

        if ($request->isAlone){
            $validator = Validator::make($request->all(), [
                'username' => 'required',
                'usersurname' => 'required',
                'userEmail' => 'required|email|unique:users,email',
                'userPhone' => 'required|numeric|unique:users,phone',
            ]);
        } else if (!Cookie::get("teammate")) {
            $validator = Validator::make($request->all(), [
                'username' => 'required',
                'usersurname' => 'required',
                'userEmail' => 'required|email|unique:users,email',
                'userPhone' => 'required|numeric|unique:users,phone',
                'userTeammateName' => 'required',
                'userTeammateSurname' => 'required',
                'userTeammatePhone' => 'required|numeric',
                'userTeammateStatus' => 'required',
            ]);
        } else{
            $validator = Validator::make($request->all(), [
                'userEmail' => 'required|email|unique:users,email',
            ]);
        }

        if ($validator->fails()) {
            return response()->json(array(
                'error' => $validator->errors()
            ), 200);
        }

        $this->token = Cookie::get('token');
        $tokenList = User::where("token", "=", $this->token)->pluck("token")->toArray();
        if (count($tokenList) >= 2) {
            return response()->json(array(
                'error' => "user_not_valid"
            ), 200);
        }

        if($request->isAlone){
            $user = new User;
            $user->name = $request->username;
            $user->surname = $request->usersurname;
            $user->email = $request->userEmail;
            $user->phone = $request->userPhone;
            $user->teammate_name = "some";
            $user->teammate_surname = "some";
            $user->teammate_phone = "some";
            $user->teammate_status = "some";
            $user->token = $this->token;
            $user->link = "user_alone";
            $user->save();
            $this->sendUserEmailResponse($request->username,  URL::to('/') . "/" . $request->cookie("token"), $request->userEmail, true);
        }else if (!Cookie::get("teammate")) {
            $user = new User;
            $user->name = $request->username;
            $user->surname = $request->usersurname;
            $user->email = $request->userEmail;
            $user->phone = $request->userPhone;
            $user->teammate_name = $request->userTeammateName;
            $user->teammate_surname = $request->userTeammateSurname;
            $user->teammate_phone = $request->userTeammatePhone;
            $user->teammate_status = $request->userTeammateStatus;
            $user->token = $this->token;
            $user->link = URL::to('/') . "/" . $request->cookie("token");
            $user->save();

            $this->sendUserEmailResponse($request->username,  URL::to('/') . "/" . $request->cookie("token"), $request->userEmail, $request->isAlone);

        } else {
            $user = User::where("token", "=", \request()->cookie("teammate"))->first();
            $teammate = new User;
            $teammate->name = $user->teammate_name;
            $teammate->surname = $user->teammate_surname;
            $teammate->email = $request->userEmail;
            $teammate->phone = $user->teammate_phone;
            $teammate->teammate_name = $user->name;
            $teammate->teammate_surname = $user->surname;
            $teammate->teammate_phone = $user->phone;
            $teammate->token = $this->token;
            $teammate->link = $user->link;

            $this->sendUserEmailResponse($teammate->name, $teammate->link, $request->userEmail);

            if ($user->teammate_status == "мама/папа") {
                $teammate->teammate_status = "сын/дочь";
            } else if ($user->teammate_status == "сын/дочь") {
                $teammate->teammate_status = "мама/папа";
            } else {
                $teammate->teammate_status = "родственник";
            }

            $teammate->save();
        }

        $userAnswers = Answer::where('user_token', $this->token)->pluck('answer')->toArray();
        $user = User::where('token', $this->token)->first();
        $userScore = 0;
        $trueCounter = 0;
        foreach ($userAnswers as $answer) {
            $isTrue = Question::where('item_text', $answer)->pluck("right_answer")->toArray();
            if ($isTrue[0] == 1) {
                $userScore += 10;
                $trueCounter++;
            } else {
                $userScore -= 1;
            }
        }

        if ($userScore < 0) $userScore = 0;
        $percent = 100 / 10 * $trueCounter;

        $this->sendAdminEmailResponse($this->token, $userScore, $user);
        if($request->isAlone){
            return response()->json(array(
                "answerPercent" => $percent,
                "answerScore" => $userScore,
                "userLink" => "Отсутствует"
            ), 200);
        }else{
            return response()->json(array(
                "answerPercent" => $percent,
                "answerScore" => $userScore,
                "userLink" => URL::to('/') . "/" . $request->cookie("token")
            ), 200);
        }
    }

    private function getNullQuestionResponse(Question $question, $null_questions, $nullQuestion, $token = null, $userInput = null)
    {
        $tokenList = User::where("token", "=", $this->token)->pluck("token")->toArray();
        if (count($null_questions) - 1 >= $nullQuestion) {
            $answers = $question->where('parent_item_id', '=', $null_questions[$nullQuestion]->id)->get();

            if (count($answers) !== 0) {
                foreach ($answers as $answer) {
                    $user_answers[] = $answer->item_text;
                }
                if ($token && $userInput !== null && count($tokenList) < 1) {
                    if (empty(Answer::where("user_token", "=", $this->token)->where('question_id', '=', $null_questions[$nullQuestion - 1]["id"])->pluck("user_token")->toArray())) {
                        $storeAnswer = new Answer();
                        $storeAnswer->user_token = $this->token;
                        $storeAnswer->question_id = $null_questions[$nullQuestion - 1]["id"];
                        $storeAnswer->answer = $userInput;
                        $storeAnswer->save();
                    }
                }
                return response()->json(array(
                    'code' => 200,
                    'ask' => $null_questions[$nullQuestion]->item_text,
                    'answer' => $user_answers,
                    'type' => "text",
                    "nullQuestion" => $nullQuestion + 1,
                    "img" => $null_questions[$nullQuestion]->question_image,
                ), 200);
            } else {
                if ($token && $userInput !== null && count($tokenList) < 1) {
                    if (empty(Answer::where("user_token", "=", $this->token)->where('question_id', '=', $null_questions[$nullQuestion - 1]["id"])->pluck("user_token")->toArray())) {
                        $storeAnswer = new Answer();
                        $storeAnswer->user_token = $this->token;
                        $storeAnswer->question_id = $null_questions[$nullQuestion - 1]["id"];
                        $storeAnswer->answer = $userInput;
                        $storeAnswer->save();
                    }
                }
                return response()->json(array(
                    'code' => 200,
                    'ask' => $null_questions[$nullQuestion]->item_text,
                    'type' => "input",
                    'type_input' => $null_questions[$nullQuestion]->input_type,
                    "nullQuestion" => $nullQuestion + 1,
                    "img" => $null_questions[$nullQuestion]->question_image,
                ), 200);
            }
        }
        if ($token && $userInput !== null && count($tokenList) < 1) {
            if (empty(Answer::where("user_token", "=", $this->token)->where('question_id', '=', $null_questions[$nullQuestion - 1]["id"])->pluck("user_token")->toArray())) {
                $storeAnswer = new Answer();
                $storeAnswer->user_token = $this->token;
                $storeAnswer->question_id = $null_questions[$nullQuestion - 1]["id"];
                $storeAnswer->answer = $userInput;
                $storeAnswer->save();
            }
        }
        if (Cookie::get("teammate")) {
            return response()->json([
                'code' => 200,
                'ask' => "LAST_RESPONSE",
                'type' => "text",
                "nullQuestion" => null,
                'isTeammate' => true
            ], 200);
        }
        return response()->json(self::LAST_RESPONSE, 200);
    }

    public function index(Request $request, Question $question)
    {
        $this->token = Cookie::get('token');
        $tokenList = User::where("token", "=", $this->token)->pluck("token")->toArray();
        $null_questions = $question
            ->where(function ($query) {
                $query->where('parent_item_id', '=', null);
            })->get();

//        if ($request->file("answer")) {
//            try {
//                $fileList = "";
//                foreach ($request->file("answer") as $file) {
//                    $file->move('./img/files', $file->getClientOriginalName());
//                    $fileList .= $file->getClientOriginalName() . ";";
//                }
//
//                if ($request->cookie("token") && count($tokenList) < 1) {
//                    $ask = $question->where("item_text", "=", $request->ask)->first();
//                    if (empty(Answer::where("user_token", "=", $this->token)->where('question_id', '=', $null_questions[$nullQuestion - 1]["id"])->pluck("user_token")->toArray())) {
//                        $storeAnswer = new Answer();
//                        $storeAnswer->user_token = $this->token;
//                        $storeAnswer->question_id = $ask->id;
//                        $storeAnswer->answer = $fileList;
//                        $storeAnswer->save();
//                    }
//                }
//            } catch (Exception $e) {
//
//            }
//            return $this->getNullQuestionResponse($question, $null_questions, $request->nullQuestion, $this->token);
//        }

        if (isset($request->answer) && ($request->type !== "input")) {

            $parent = $question->where('item_text', '=', $request->answer)->first();

            if (!empty($parent)) {
                $questions = $question->where('parent_item_id', '=', $parent->id)->get();

                if (count($questions) !== 0) {
                    return response()->json(array(
                        'code' => 200,
                        'ask' => $questions[0]->item_text,
                        'type' => $question->type,
                        'type_input' => $null_questions[$request->nullQuestion]->input_type,
                        "nullQuestion" => $request->nullQuestion,
                        "img" => $questions[0]->question_image,
                    ), 200);
                } else {
                    return $this->getNullQuestionResponse($question, $null_questions, $request->nullQuestion, Cookie::get('token'), $request->answer);
                }

            } else {
                if ($request->cookie("token") && count($tokenList) < 1) {
                    $ask = $question->where("item_text", "=", $request->ask)->first();
                    $storeAnswer = new Answer();
                    $storeAnswer->user_token = $request->cookie("token");
                    $storeAnswer->question_id = $ask->id;
                    $storeAnswer->answer = $request->answer;
                    $storeAnswer->save();
                }
                if (Cookie::get("teammate")) {
                    return response()->json([
                        'code' => 200,
                        'ask' => "LAST_RESPONSE",
                        'type' => "text",
                        "nullQuestion" => null,
                        'isTeammate' => true
                    ], 200);
                }
                return response()->json(self::LAST_RESPONSE, 200);
            }

        } else {
            return $this->getNullQuestionResponse($question, $null_questions, $request->nullQuestion, $request->cookie("token"), $request->answer);
        }

    }

    public function teammateHome($token)
    {
        $user_token = User::where('link', '=', URL::to('/') . "/" . $token)->pluck("link")->toArray();
        if (empty($user_token) || count($user_token) === 2) {
            return redirect("/");
        } else {
            $this->userCookie = cookie('token', md5($token), 43200);
            $teammateCookie = cookie('teammate', $token, 43200);
            Cookie::queue($this->userCookie);
            Cookie::queue($teammateCookie);
            return Response::view("welcome");
        }
    }

    public function home(Request $request, Question $question)
    {

        $request->session()->regenerate();
        $this->token = md5($request->session()->getId());
        $this->userCookie = cookie('token', $this->token, 43200);
        if (Cookie::get("teammate")) {
            Cookie::queue(Cookie::forget('teammate'));
            Cookie::queue(Cookie::forget('token'));
        }
        if (!$request->cookie("token")) {
            Cookie::queue($this->userCookie);
            return Response::view("welcome");
        } else {
            return Response::view("welcome");
        }
    }

    public function sendUserEmailResponse($name, $link, $email, $isAlone = false)
    {

        $text = $this->getTemplate($name, $link, $email, $isAlone);

        $from = "IH Voronezh <noreply@ihvoronezh.com>";
        //$to = "meteora-90@yandex.ru";
        $to = $email;
        $subject = "Викторина по английскому языку";

// Заголовки письма === >>>
        $headers = "From: $from\r\n";
//$headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "Date: " . date("r") . "\r\n";
        $headers .= "X-Mailer: zm php script\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative;\r\n";
        $baseboundary = "------------" . strtoupper(md5(uniqid(rand(), true)));
        $headers .= "  boundary=\"$baseboundary\"\r\n";
// <<< ====================

// Тело письма === >>>
        $message = "--$baseboundary\r\n";
        $message .= "Content-Type: text/plain;\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= "--$baseboundary\r\n";
        $newboundary = "------------" . strtoupper(md5(uniqid(rand(), true)));
        $message .= "Content-Type: multipart/related;\r\n";
        $message .= "  boundary=\"$newboundary\"\r\n\r\n\r\n";
        $message .= "--$newboundary\r\n";
        $message .= "Content-Type: text/html; charset=utf-8\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= $text . "\r\n\r\n";
// <<< ==============

// заканчиваем тело письма, дописываем разделители
        $message .= "--$newboundary--\r\n\r\n";
        $message .= "--$baseboundary--\r\n";
// отправка письма
        mail($to, $subject, $message, $headers);
        return;
    }

    public function sendAdminEmailResponse($token, $rating, $userdata)
    {

        $questions = Answer::where("user_token", "=", $token)->get();

        $text = "
        <table border='0' cellpadding='0' cellspacing='0' >
            <tr>
                <td style='padding: 15px 20px;'>Вопрос</td>
                <td style='padding: 15px 20px;'>Ответ</td>
            </tr>
        ";
        foreach ($questions as $question) {
            $ask = Question::where("id", "=", $question->question_id)->first();
            $text .= "<tr><td style='padding: 15px 20px;'>{$ask->item_text}</td><td>{$question->answer}</td></tr>";
        }
        $text .= "<tr><td style='padding: 15px 20px;' colspan='2'>Данные пользователя</td> </tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Имя</td><td>{$userdata->name}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Фамилия</td><td>{$userdata->surname}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Email</td><td>{$userdata->email}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Телефон</td><td>{$userdata->phone}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Имя сокомандника</td><td>{$userdata->teammate_name}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Фамилия сокомандника</td><td>{$userdata->teammate_surname}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Телефон сокомандника</td><td>{$userdata->teammate_phone}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Статус сокомандника</td><td>{$userdata->teammate_status}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Ссылка</td><td>{$userdata->link}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Время прохождения</td><td>{$userdata->created_at}</td></tr>";
        $text .= "<tr><td style='padding: 15px 20px;' colspan='2'>Набранный рейтинг</td> </tr>";
        $text .= "<tr><td style='padding: 15px 20px;'>Балл</td><td>{$rating}</td></tr>";
        $text .= "</table>";

        $from = "IH Voronezh <noreply@ihvoronezh.com>";
        //$to = "dasaderto@gmail.com";
        $to = "info.ihvrn@gmail.com";
        $subject = "Викторина по английскому языку";
// Заголовки письма === >>>
        $headers = "From: $from\r\n";
//$headers .= "To: $to\r\n";
        $headers .= "Subject: $subject\r\n";
        $headers .= "Date: " . date("r") . "\r\n";
        $headers .= "X-Mailer: zm php script\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: multipart/alternative;\r\n";
        $baseboundary = "------------" . strtoupper(md5(uniqid(rand(), true)));
        $headers .= "  boundary=\"$baseboundary\"\r\n";
// <<< ====================

// Тело письма === >>>
        $message = "--$baseboundary\r\n";
        $message .= "Content-Type: text/plain;\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= "--$baseboundary\r\n";
        $newboundary = "------------" . strtoupper(md5(uniqid(rand(), true)));
        $message .= "Content-Type: multipart/related;\r\n";
        $message .= "  boundary=\"$newboundary\"\r\n\r\n\r\n";
        $message .= "--$newboundary\r\n";
        $message .= "Content-Type: text/html; charset=utf-8\r\n";
        $message .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
        $message .= $text . "\r\n\r\n";
// <<< ==============

// заканчиваем тело письма, дописываем разделители
        $message .= "--$newboundary--\r\n\r\n";
        $message .= "--$baseboundary--\r\n";
// отправка письма
        mail($to, $subject, $message, $headers);
        return;
    }


    public function getTemplate($name, $link, $email,$isAlone)
    {

        $comment = "<div style=\"text-align: left; float: left;\">
                            <img src=\"" . asset("img/mail-boy.png") . "\" alt=\"#\" class=\"img-left\">
                        </div>
                        <div style='text-align: right; float: right;'>
                            <img src=\"" . asset("img/mail-women.png") . "\" alt=\"#\" class=\"img-right\">
                        </div>";

        $isSendLink = "";
        if(!$isAlone){
            $isSendLink = "<li style='font-size: 16px; font-weight: 500; margin-bottom: 20px;'>
                                Отправте своему напарнику ссылку для прохождения тестирования:<br>
                                <span style='font-size: 18px; color: #01438d; font-weight: bold;'>" . $link . "</span><br>
                                Участником может быть мама или папа, сын или дочь, или другой родственник.
                            </li>";
        }

        return "<table cellpadding='0' cellspacing='0' style=\"
        max-width: 1080px;
        margin: auto;
        font-family: sans-serif;
    \">
        <thead style=\"background: #f2891a;\">
            <tr>
                <td style=\"background:url(" . asset("img/mail-top.png") . ") no-repeat center; width: 100vw;height: 160px;text-align: center;\"
                    colspan=2>
                    <a href=\"https://ihvoronezh.com/\"><img src=\"" . asset("img/logo.png") . "\" alt=\"logo\"></a>
                </td>
            </tr>
            <tr>
                <td style=\"text-align:center; position: relative;\" colspan=2>
                    <table style='width: 100%;'>
                    <tr>
                        <td style='vertical-align: bottom;width: 270px;'>
                            <div style=\"text-align: left;\">
                                <img src=\"" . asset("img/mail-boy.png") . "\" alt=\"#\" class=\"img-left\" style='display: block;'>
                            </div>
                        </td>
                        <td style='height: 400px;'>
                            <h1 class=\"email-title\" style=\"color: #fff;font-size: 36px;\">
                                Семейное тестирование<br>
                                с призами от <br> IH International <br>
                                House Voronezh-Linguist <br>
                            </h1>
                        </td>
                        <td style='vertical-align: bottom;width: 270px;'>
                            <div style='text-align: right;'>
                                <img src=\"" . asset("img/mail-women.png") . "\" alt=\"#\" class=\"img-right\" style='display: block;'>
                            </div>
                        </td>
                    </tr>
                    </table>
                </td>
            </tr>
        </thead>
        <tbody>
            <tr style=\"background: #fff;\">
                <td style=\"height: 460px; padding: 0 150px;\" colspan=2>
                    <span
                        style=\"display: block; width: 42px; height: 4px; background: #01438d; margin: 0 auto 30px;\"></span>
                    <p style=\"font-size: 16px; color:#000; max-width: 650px;\">
                        <span style='display: block; font-size: 20px; font-weight: bold; color: #353535;'>" . $name . ", теперь вы участник конкурса!</span><br>
                        <ul style='list-style-image: url(" . asset('img/mail-list.png') . ")'>
                            ".$isSendLink."
                            <li style='font-size: 16px; font-weight: 500; margin-bottom: 20px;'>
                                Всем участникам мы дарим купоны на обучение в <a href='http://ihvoronezh.com/?utm_source=mail&utm_medium=promo&utm_campaign=ih-link'>IH Voronezh.</a><br>
                                Чтобы получить его, приходите в любой филиал, выбирайте курс и радуйтесь новым знаниям.
                            </li>
                            <li style='font-size: 16px; font-weight: 500; margin-bottom: 20px;'>
                                 Розыгрыш главных призов - Беспроводных наушников Apple и бесплатного годового обучения в IH Voronezh состоится 29 сентября в ДК Железнодорожников                   
                            </li>
                        </ul>
                    </p>
                    <span
                        style=\"display: block; width: 42px; height: 4px; background: #01438d; margin: 30px auto 0px;\"></span>
                </td>
            </tr>
        </tbody>
        <tfoot style=\"background: url(" . asset("img/mail-footer.png") . ") no-repeat;
        background-size: cover;\">
            <tr style=\"height: 285px;\">
                <td style=\"padding-left: 100px; padding-right: 100px;\">
                    <div class=\"block\" style=\"width: 45%; float: left;\">
                        <span
                            style=\"display: block; font-weight: 600; font-size: 16px; color: #2f2f2f; margin-bottom: 10px;\">Присоединяйтесь
                            к
                            нам в соцсетях:</span>
                        <a href=\"https://vk.com/ih_voronezh_linguist\" style=\"text-decoration: none;\">
                           <img src='" . asset("img/vk.png") . "' alt='https://vk.com/ih_voronezh_linguist'>
                        </a>
                        <a href=\"https://www.facebook.com/IHVoronezhLinguist\" style=\"text-decoration: none;\">
                            <img src='" . asset("img/facebook.png") . "' alt='https://www.facebook.com/IHVoronezhLinguist'>
                        </a>
                        <a href=\"https://www.instagram.com/ih_voronezh/\" style=\"text-decoration: none;\">
                            <img src='" . asset("img/inst.png") . "' alt='https://www.instagram.com/ih_voronezh'>
                        </a>
                    </div>
                    <div class=\"block\" style=\"text-align: right; float: right; width: 45%;\">
                        <a href=\"https://ihvoronezh.com/contact/\"
                            style=\"text-decoration: underline; color:#01438d; font-size: 16px; display: block; margin-bottom: 10px; font-weight: 600;\">Адреса
                            учебных
                            центров</a>
                        <a href=\"tel:+74732718000\"
                            style=\"color: #2f2f2f; font-size: 16px; text-decoration: none;\">+7(473)2-718-000</a>
                    </div>
                    <div class='block' style=\"margin-top: 150px; text-align:center;\">
                        <span style=\"color: #2f2f2f; font-size: 16px; text-align: center;\">
                            <a href=\"#\"
                                style=\"text-decoration: underline; color:#01438d; font-size: 16px; font-weight: 600;\">Отписаться</a>
                            от всех новостей школы
                        </span>
                    </div>
                </td>
            </tr>
        </tfoot>
    <style>
        ul{
            list-style:none;
            margin: 0;
            padding: 0;
            li{
                margin-bottom: 20px;
                position: relative;
                padding-left: 50px;
            }
            li:before {
                content: url(" . asset('img/mail-list.png') . ");
                position: absolute;
                left: 0;
                top: -4px;
            }
        }
        .img-left {
            position: absolute;
            bottom: 0;
            left: 40px;
        }

        .img-right {
            position: absolute;
            bottom: 0;
            right: 0px;
        }

        td {
            padding: 0 15px;
        }

        @media (max-width:850px) {
            h1.email-title {
                margin: 30px 0 270px !important;
            }
        }

        @media (max-width:700px) {
            tfoot tr td {
                padding: 0 50px !important;
            }
        }

        @media (max-width:480px) {
            h1.email-title {
                font-size: 28px !important;
                margin: 100px 0 !important;
            }

            .img-left {
                display: none;
            }

            .img-right {
                display: none;
            }

            tfoot tr td {
                padding: 0 20px !important;
            }

            .block {
                display: block;
                float: none !important;
                text-align: left !important;
                margin: 15px !important;
                width: calc(100% - 40px) !important;
            }
        }
    </style>
    ";
    }
}
