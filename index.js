const express = require("express");
const app = express();
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");

app.use(cors());
app.use(bodyParser.json());

app.listen(3001);

const DATABASE = {
  CONFIG: {
    host: "localhost",
    user: "root",
    password: "1234",
    database: "student_management",
  },
  QUERY: {
    LECTURE_ROOM: {},
    COURSE: {
      FINDALL: "select * from course",
      FINDIDNAME: "select course_id, course_name from course",
    },
    COURSE_SCHEDULE: {},
    CURRICULUM: {},
    TUTOR: {
      FINDALL: "select * from tutor",
      FINDEMAILPASSWORD:
        "select * from tutor where tutor_email = ? and tutor_password = ?",
    },
    EDUCATION: {},
    STUDENT: {
      FINDALL: "select * from student",
      ADDSTU:
        "insert into student (student_name,student_email,student_phone,course_id) values (?,?,?,?)",
    },
    ENROLLMENT: {},
  },
};

const executeQuery = async (query, params = []) => {
  try {
    const connection = await mysql.createConnection(DATABASE.CONFIG);
    const [results] = await connection.query(query, params);
    await connection.end();
    return results;
  } catch (err) {
    console.log(err);
  }
};

const getStudents = async () => executeQuery(DATABASE.QUERY.STUDENT.FINDALL);
const getCourse = async () => executeQuery(DATABASE.QUERY.COURSE.FINDALL);
const getTutor = async () => executeQuery(DATABASE.QUERY.TUTOR.FINDALL);

app.get("/student/test", async (req, res) => {
  res.json(await getStudents());
});

app.get("/course", async (req, res) => {
  res.json(await getCourse());
  // console.log(res.json(await getCourse()));
});

// course 데이터 가져오기

const getCourseIdName = async () =>
  executeQuery(DATABASE.QUERY.COURSE.FINDIDNAME);

app.get("/course/course_list", async (req, res) => {
  res.send(await getCourseIdName());
});

// 데이터 전송
const addStuents = async (
  student_name,
  student_email,
  student_phone,
  course_id
) =>
  executeQuery(DATABASE.QUERY.STUDENT.ADDSTU, [
    student_name,
    student_email,
    student_phone,
    course_id,
  ]);

app.post("/student/register", async (req, res) => {
  const students = req.body;

  console.log("Received students:", students); // 데이터 출력하여 확인

  const results = [];
  for (const student of students) {
    const { student_name, student_email, student_phone, course_id } = student;
    const result = await addStuents(
      student_name,
      student_email,
      student_phone,
      course_id
    );
    results.push(result);
  }
  res.json({ results });
});

//http://localhost:3001/tutor 에 tutor 정보 배열로 저장
app.get("/tutor", async (req, res) => {
  res.send(await getTutor());
});

const getTutorLogin = async (tutor_email, tutor_password) => {
  return await executeQuery(DATABASE.QUERY.TUTOR.FINDEMAILPASSWORD, [
    tutor_email,
    tutor_password,
  ]);
};

app.post("/tutor/login", async (req, res) => {
  const { email, password } = req.body; // 클라이언트 post요청으로 보낸 데이터 req.body 에 있음

  const sendData = { isLogin: "" }; //로그인 성공 여부. 초기에는 빈 문자열.

  //id 와 password가 둘 다 입력 됐을 경우
  if (email && password) {
    try {
      console.log("Received tutors: ", { email, password });

      // 쿼리 실행해서 데이터베이스의 일치한 값이 있으면 results에 배열로 저장
      //일치하는 값이 없으면 저장이 안되므로 result.length = 0
      const results = await getTutorLogin(email, password);

      if (results.length > 0) {
        sendData.isLogin = "True";
        res.json(sendData); // 변경: res.send -> res.json
      } else {
        sendData.isLogin = "아이디 정보 또는 비밀번호가 일치하지 않습니다.";
        res.json(sendData); // 변경: res.send -> res.json
      }
    } catch (error) {
      console.error("Database query error: ", error);
      sendData.isLogin = "서버 오류가 발생했습니다. 다시 시도해 주세요.";
      res.json(sendData); // 변경: res.send -> res.json
    }
  } else {
    sendData.isLogin = "아이디와 비밀번호를 입력하세요!";
    res.json(sendData); // 변경: res.send -> res.json
  }
});

app.post("/main", async (req, res) => {
  const { tutor_email, tutor_password } = req.body;
  //localstorage의 tutor_email과 password가 전달 되었을 경우

  if (tutor_email && tutor_password) {
    try {
      console.log("Received tutors: ", { tutor_email, tutor_password });

      // 쿼리 실행해서 데이터베이스의 일치한 값이 있으면 results에 배열로 저장
      //일치하는 값이 없으면 저장이 안되므로 result.length = 0
      const results = await getTutorLogin(tutor_email, tutor_password);

      if (results.length > 0) {
        // 튜터가 존재하는 경우 튜터의 정보를 반환
        const tutor = results[0];
        const tutorInfo = {
          tutor_id: tutor.tutor_id,
          tutor_name: tutor.tutor_name,
          tutor_phone: tutor.tutor_phone,
          tutor_email: tutor.tutor_email,
          curriculum_id: tutor.curriculum_id,
        };
        res.json(tutorInfo);
      } else {
        res
          //401=> 로그인되지 않은 사용자가 접근하려할 때
          .status(401)
          .json({ message: "이메일 또는 비밀번호가 일치하지 않습니다." });
      }
    } catch (error) {
      console.error("Database query error: ", error);
      res
        //500 => 서버에 내부 오류가 발생했음을 나타냅니다.
        .status(500)
        .json({ message: "서버 오류가 발생했습니다. 다시 시도해 주세요." });
    }
  } else {
    //400 => 필수 입력값이 빠진 요청을 보냈을 때.
    res.status(400).json({ message: "이메일과 비밀번호를 입력하세요!" });
  }
});
