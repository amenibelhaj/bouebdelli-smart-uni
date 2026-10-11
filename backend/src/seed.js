// Fills the database with demo data.
//
//   npm run seed        -> DELETES ALL DATA, recreates the tables and inserts demo data
//
// Every demo account uses the password: password123

require("dotenv").config();

const bcrypt = require("bcrypt");

const {
    sequelize,
    User,
    Student,
    Teacher,
    Group,
    Course,
    Classroom,
    Schedule,
    Attendance,
    Note,
    Device
} = require("./models");

const { toDateString, dayName } = require("./utils/time");


const PASSWORD = "password123";


async function seed() {

    await sequelize.authenticate();

    // Drop and recreate every table
    await sequelize.sync({ force: true });

    const password = await bcrypt.hash(PASSWORD, 10);

    const createUser = (name, email, role) =>
        User.create({ name, email, password, role, status: "active" });


    // ---------- Groups, courses, classrooms ----------

    const [groupA, groupB] = await Group.bulkCreate([
        { name: "3CS-A", year: "3ème année", department: "Informatique" },
        { name: "3CS-B", year: "3ème année", department: "Informatique" }
    ]);

    const [dbCourse, mlCourse, webCourse, netCourse, engCourse] = await Course.bulkCreate([
        { name: "Bases de données", description: "SQL et gestion des bases de données" },
        { name: "Machine Learning", description: "Introduction à l'apprentissage automatique" },
        { name: "Développement Web", description: "React, Node.js et API REST" },
        { name: "Réseaux", description: "Protocoles et architecture des réseaux" },
        { name: "Anglais", description: "Anglais professionnel" }
    ]);

    const [b6, a12, c3, labo] = await Classroom.bulkCreate([
        { name: "B6", capacity: 30, building: "Bâtiment principal" },
        { name: "A12", capacity: 25, building: "Bâtiment sciences" },
        { name: "C3", capacity: 40, building: "Bâtiment principal" },
        { name: "Labo 1", capacity: 20, building: "Bâtiment sciences" }
    ]);


    // ---------- Users ----------

    await createUser("Administrateur", "admin@smartuni.com", "admin");

    const teacherUsers = [
        ["Ahmed Ben Ali", "ahmed@smartuni.com", "Intelligence Artificielle"],
        ["Sonia Trabelsi", "sonia@smartuni.com", "Bases de données"],
        ["Karim Jaziri", "karim@smartuni.com", "Réseaux et Web"]
    ];

    const teachers = [];

    for (const [name, email, speciality] of teacherUsers) {
        const user = await createUser(name, email, "teacher");
        teachers.push(await Teacher.create({ user_id: user.id, speciality, department: "Informatique" }));
    }

    const [ahmed, sonia, karim] = teachers;

    const studentUsers = [
        ["Ameni Belhaj Salem", "ameni@smartuni.com", groupA],
        ["Salma Ben Romdhane", "salma@smartuni.com", groupA],
        ["Youssef Gharbi", "youssef@smartuni.com", groupA],
        ["Mariem Chaabane", "mariem@smartuni.com", groupA],
        ["Omar Haddad", "omar@smartuni.com", groupA],
        ["Ines Mabrouk", "ines@smartuni.com", groupB],
        ["Mehdi Ayari", "mehdi@smartuni.com", groupB],
        ["Rania Khelifi", "rania@smartuni.com", groupB],
        ["Aziz Sassi", "aziz@smartuni.com", groupB]
    ];

    let number = 1;

    for (const [name, email, group] of studentUsers) {
        const user = await createUser(name, email, "student");
        await Student.create({
            user_id: user.id,
            group_id: group.id,
            student_number: "ST" + String(number++).padStart(3, "0")
        });
    }

    // One account waiting for activation, to show the feature
    await User.create({
        name: "Nouvel Étudiant",
        email: "nouveau@smartuni.com",
        password,
        role: "student",
        status: "pending"
    }).then(user => Student.create({ user_id: user.id, group_id: groupB.id, student_number: "ST099" }));


    // ---------- Timetable (Monday to Saturday) ----------

    const slot = (group, course, teacher, room, day, start, end) => ({
        group_id: group.id,
        course_id: course.id,
        teacher_id: teacher.id,
        classroom_id: room.id,
        day,
        start_time: start,
        end_time: end
    });

    const schedules = await Schedule.bulkCreate([
        slot(groupA, dbCourse, sonia, b6, "Monday", "08:30", "10:00"),
        slot(groupA, mlCourse, ahmed, a12, "Monday", "10:15", "11:45"),
        slot(groupB, webCourse, karim, c3, "Monday", "08:30", "10:00"),
        slot(groupB, dbCourse, sonia, b6, "Monday", "10:15", "11:45"),

        slot(groupA, webCourse, karim, labo, "Tuesday", "08:30", "10:00"),
        slot(groupA, netCourse, karim, c3, "Tuesday", "13:00", "14:30"),
        slot(groupB, mlCourse, ahmed, a12, "Tuesday", "10:15", "11:45"),

        slot(groupA, engCourse, sonia, c3, "Wednesday", "10:15", "11:45"),
        slot(groupB, netCourse, karim, c3, "Wednesday", "13:00", "14:30"),

        slot(groupA, mlCourse, ahmed, labo, "Thursday", "13:00", "14:30"),
        slot(groupB, webCourse, karim, labo, "Thursday", "08:30", "10:00"),

        slot(groupA, dbCourse, sonia, b6, "Friday", "08:30", "10:00"),
        slot(groupB, engCourse, sonia, c3, "Friday", "10:15", "11:45"),

        slot(groupA, webCourse, karim, labo, "Saturday", "08:30", "10:00"),
        slot(groupB, mlCourse, ahmed, a12, "Saturday", "10:15", "11:45")
    ]);


    // ---------- Door camera boxes (one per classroom) ----------

    const devices = await Device.bulkCreate([b6, a12, c3, labo].map(room => ({
        name: `Caméra porte ${room.name}`,
        classroom_id: room.id,
        api_key: `demo-key-${room.name.toLowerCase().replace(/\s+/g, "")}`
    })));


    // ---------- Teacher notes ----------

    const inDays = n => {
        const d = new Date();
        d.setDate(d.getDate() + n);
        d.setHours(23, 59, 0, 0);
        return d;
    };

    await Note.bulkCreate([
        {
            teacher_id: sonia.id, course_id: dbCourse.id, group_id: groupA.id,
            title: "Rendu du mini-projet SQL",
            message: "Déposez votre rapport (PDF) et vos scripts SQL avant la date limite. Aucun retard accepté.",
            deadline: inDays(5)
        },
        {
            teacher_id: ahmed.id, course_id: mlCourse.id, group_id: groupA.id,
            title: "Lecture obligatoire",
            message: "Lisez le chapitre 3 (régression linéaire) avant la prochaine séance."
        },
        {
            teacher_id: karim.id, course_id: webCourse.id, group_id: groupB.id,
            title: "TP React à terminer",
            message: "Terminez le TP sur les composants React et envoyez le lien GitHub.",
            deadline: inDays(3)
        },
        {
            teacher_id: ahmed.id, course_id: mlCourse.id, group_id: groupB.id,
            title: "Quiz la semaine prochaine",
            message: "Quiz de 20 minutes sur les chapitres 1 et 2."
        }
    ]);


    // ---------- Attendance history for the last 3 weeks ----------
    // (random but realistic, so the dashboards have something to show)

    const students = await Student.findAll();
    const records = [];

    let random = 42;
    const rand = () => {
        random = (random * 16807) % 2147483647;
        return random / 2147483647;
    };

    const now = new Date();

    for (let back = 21; back >= 1; back--) {

        const day = new Date(now);
        day.setDate(now.getDate() - back);
        const date = toDateString(day);

        for (const schedule of schedules.filter(s => s.day === dayName(day))) {

            for (const student of students.filter(s => s.group_id === schedule.group_id)) {
                const present = rand() < 0.85;
                records.push({
                    user_id: student.user_id,
                    schedule_id: schedule.id,
                    date,
                    status: present ? "present" : "absent",
                    confidence: present ? Math.round((0.55 + rand() * 0.35) * 100) / 100 : null
                });
            }

            const teacher = teachers.find(t => t.id === schedule.teacher_id);
            const teacherPresent = rand() < 0.95;

            records.push({
                user_id: teacher.user_id,
                schedule_id: schedule.id,
                date,
                status: teacherPresent ? "present" : "absent",
                confidence: teacherPresent ? Math.round((0.6 + rand() * 0.3) * 100) / 100 : null
            });
        }
    }

    await Attendance.bulkCreate(records);


    console.log("\nDemo data created.");
    console.log(`Password for every account: ${PASSWORD}\n`);
    console.log("  Admin     admin@smartuni.com");
    console.log("  Teachers  ahmed@smartuni.com, sonia@smartuni.com, karim@smartuni.com");
    console.log("  Students  ameni@smartuni.com (3CS-A), ines@smartuni.com (3CS-B), ...\n");
    console.log("Door camera keys:");
    for (const device of devices) {
        console.log(`  ${device.name}: ${device.api_key}`);
    }
    console.log(`\nAttendance records: ${records.length}`);
}


seed()
    .then(() => sequelize.close())
    .catch(error => {
        console.error("Seed failed:", error.message);
        process.exit(1);
    });
