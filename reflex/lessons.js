/* ============================================================
   KHO TỪ VỰNG / MẪU CÂU CHO CHẾ ĐỘ HỌC — tách riêng khỏi logic
   ------------------------------------------------------------
   Cấu trúc:

     topic = { id, icon, name, desc, levels[] }
     level = { id, name, items[] }
     item  = { en, vi, ipa?, phrase? }

   • `en`     từ / câu tiếng Anh
   • `vi`     nghĩa tiếng Việt
   • `ipa`    phiên âm (có thể bỏ trống)
   • `phrase` true nếu là cụm từ / cả câu (dùng để chọn kiểu câu hỏi khi luyện)

   Muốn thêm chủ đề mới: thêm 1 object vào mảng `topics` bên dưới.
   Muốn thêm ngôn ngữ khác: nhân bản file này thành lessons-<lang>.js
   (script.js chỉ đọc window.ReflexLessons nên không phải sửa logic).
   ============================================================ */
window.ReflexLessons = (() => {
  "use strict";

  /* ---------- helper cho gọn ---------- */
  const e = (en, vi, ipa) => ({ en, vi, ipa: ipa || "", phrase: false });
  const p = (en, vi) => ({ en, vi, ipa: "", phrase: true });

  const L = (id, name, items) => ({ id, name, items });
  const T = (id, icon, name, desc, levels) => ({ id, icon, name, desc, levels });

  return {
    topics: [
      /* ================= 1. GIA ĐÌNH ================= */
      T("family", "👨‍👩‍👧", "Gia đình", "Người thân, vai vế trong nhà", [
        L("basic", "Cơ bản", [
          e("mother", "mẹ", "/ˈmʌð.ər/"),
          e("father", "bố", "/ˈfɑː.ðər/"),
          e("sister", "chị / em gái", "/ˈsɪs.tər/"),
          e("brother", "anh / em trai", "/ˈbrʌð.ər/"),
          e("baby", "em bé", "/ˈbeɪ.bi/"),
          e("son", "con trai", "/sʌn/"),
          e("daughter", "con gái", "/ˈdɔː.tər/"),
          e("family", "gia đình", "/ˈfæm.əl.i/"),
          e("grandmother", "bà", "/ˈɡræn.mʌð.ər/"),
          e("grandfather", "ông", "/ˈɡræn.fɑː.ðər/"),
        ]),
        L("medium", "Trung cấp", [
          e("uncle", "chú / bác", "/ˈʌŋ.kəl/"),
          e("aunt", "cô / dì", "/ɑːnt/"),
          e("cousin", "anh chị em họ", "/ˈkʌz.ən/"),
          e("nephew", "cháu trai", "/ˈnef.juː/"),
          e("niece", "cháu gái", "/niːs/"),
          e("husband", "chồng", "/ˈhʌz.bənd/"),
          e("wife", "vợ", "/waɪf/"),
          e("relative", "người họ hàng", "/ˈrel.ə.tɪv/"),
          e("twins", "sinh đôi", "/twɪnz/"),
          e("in-laws", "bố mẹ vợ / chồng", "/ˈɪn.lɔːz/"),
        ]),
        L("hard", "Nâng cao", [
          p("She takes after her mother.", "Cô ấy giống mẹ."),
          p("We are a close-knit family.", "Gia đình chúng tôi rất gắn bó."),
          p("He's the black sheep of the family.", "Anh ta là đứa con lạc loài trong nhà."),
          p("My grandparents live in the countryside.", "Ông bà tôi sống ở nông thôn."),
          p("She's expecting her second child.", "Cô ấy đang mang thai đứa con thứ hai."),
          p("They got married last summer.", "Họ kết hôn mùa hè năm ngoái."),
          p("I look up to my older brother.", "Tôi rất ngưỡng mộ anh trai mình."),
          p("We usually have dinner together on Sundays.", "Chúng tôi thường ăn tối cùng nhau vào Chủ nhật."),
        ]),
      ]),

      /* ================= 2. GIAO TIẾP ================= */
      T("greeting", "💬", "Giao tiếp hằng ngày", "Chào hỏi, cảm ơn, xin lỗi, câu giao tiếp", [
        L("basic", "Cơ bản", [
          p("hello", "xin chào"),
          p("goodbye", "tạm biệt"),
          p("thank you", "cảm ơn"),
          p("sorry", "xin lỗi"),
          p("please", "làm ơn"),
          p("good morning", "chào buổi sáng"),
          p("good night", "chúc ngủ ngon"),
          p("how are you?", "bạn có khỏe không?"),
          p("nice to meet you", "rất vui được gặp bạn"),
          p("see you later", "hẹn gặp lại"),
        ]),
        L("medium", "Trung cấp", [
          p("Excuse me, can I ask something?", "Xin lỗi, tôi hỏi một chút được không?"),
          p("Could you say that again?", "Bạn nói lại được không?"),
          p("No worries.", "Không sao đâu."),
          p("That sounds great.", "Nghe hay đấy."),
          p("I'd love to.", "Tôi rất muốn."),
          p("Let's keep in touch.", "Giữ liên lạc nhé."),
          p("It's up to you.", "Tùy bạn."),
          p("Never mind.", "Không sao / bỏ qua đi."),
          p("Long time no see.", "Lâu rồi không gặp."),
          p("What do you do for a living?", "Bạn làm nghề gì?"),
        ]),
        L("hard", "Nâng cao", [
          p("I'm afraid I can't make it.", "E rằng tôi không đến được."),
          p("Would you mind speaking more slowly?", "Bạn có phiền nói chậm hơn không?"),
          p("I couldn't agree more.", "Tôi hoàn toàn đồng ý."),
          p("Let me get back to you on that.", "Để tôi trả lời bạn sau về việc đó."),
          p("That's very kind of you.", "Bạn thật tốt."),
          p("It slipped my mind.", "Tôi quên mất rồi."),
          p("I'm on my way.", "Tôi đang trên đường tới."),
          p("Speak of the devil!", "Nói Tào Tháo, Tào Tháo tới!"),
        ]),
      ]),

      /* ================= 3. TRƯỜNG HỌC ================= */
      T("school", "🎓", "Trường học & học tập", "Lớp học, bài tập, thi cử", [
        L("basic", "Cơ bản", [
          e("teacher", "giáo viên", "/ˈtiː.tʃər/"),
          e("student", "học sinh", "/ˈstjuː.dənt/"),
          e("school", "trường học", "/skuːl/"),
          e("book", "quyển sách", "/bʊk/"),
          e("pen", "cái bút", "/pen/"),
          e("pencil", "bút chì", "/ˈpen.səl/"),
          e("notebook", "vở", "/ˈnəʊt.bʊk/"),
          e("class", "lớp học", "/klɑːs/"),
          e("homework", "bài tập về nhà", "/ˈhəʊm.wɜːk/"),
          e("exam", "bài kiểm tra", "/ɪɡˈzæm/"),
        ]),
        L("medium", "Trung cấp", [
          e("library", "thư viện", "/ˈlaɪ.brer.i/"),
          e("subject", "môn học", "/ˈsʌb.dʒekt/"),
          e("semester", "học kỳ", "/sɪˈmes.tər/"),
          e("assignment", "bài tập được giao", "/əˈsaɪn.mənt/"),
          e("lecture", "buổi giảng bài", "/ˈlek.tʃər/"),
          e("tuition", "học phí", "/tjuˈɪʃ.ən/"),
          e("scholarship", "học bổng", "/ˈskɒl.ə.ʃɪp/"),
          e("curriculum", "chương trình học", "/kəˈrɪk.jə.ləm/"),
          e("attendance", "việc đi học đầy đủ", "/əˈten.dəns/"),
          e("graduate", "tốt nghiệp", "/ˈɡrædʒ.u.ət/"),
        ]),
        L("hard", "Nâng cao", [
          p("I need to hand in my essay by Friday.", "Tôi phải nộp bài luận trước thứ Sáu."),
          p("She's majoring in economics.", "Cô ấy học chuyên ngành kinh tế."),
          p("The exam was harder than I expected.", "Bài thi khó hơn tôi tưởng."),
          p("Could you explain this part again?", "Bạn giải thích lại phần này được không?"),
          p("I'm preparing for the final test.", "Tôi đang ôn cho bài kiểm tra cuối kỳ."),
          p("He dropped out of university.", "Anh ấy bỏ học đại học."),
          p("Practice makes perfect.", "Có công mài sắt có ngày nên kim."),
          p("I take notes during every lecture.", "Tôi ghi chép trong mọi buổi giảng."),
        ]),
      ]),

      /* ================= 4. CÔNG VIỆC ================= */
      T("work", "💼", "Công việc & văn phòng", "Nghề nghiệp, họp hành, đồng nghiệp", [
        L("basic", "Cơ bản", [
          e("job", "công việc", "/dʒɒb/"),
          e("office", "văn phòng", "/ˈɒf.ɪs/"),
          e("boss", "sếp", "/bɒs/"),
          e("meeting", "cuộc họp", "/ˈmiː.tɪŋ/"),
          e("email", "thư điện tử", "/ˈiː.meɪl/"),
          e("team", "nhóm", "/tiːm/"),
          e("company", "công ty", "/ˈkʌm.pə.ni/"),
          e("salary", "lương", "/ˈsæl.ər.i/"),
          e("interview", "buổi phỏng vấn", "/ˈɪn.tə.vjuː/"),
          e("deadline", "hạn chót", "/ˈded.laɪn/"),
        ]),
        L("medium", "Trung cấp", [
          e("colleague", "đồng nghiệp", "/ˈkɒl.iːɡ/"),
          e("manager", "quản lý", "/ˈmæn.ɪ.dʒər/"),
          e("contract", "hợp đồng", "/ˈkɒn.trækt/"),
          e("promotion", "sự thăng chức", "/prəˈməʊ.ʃən/"),
          e("overtime", "làm thêm giờ", "/ˈəʊ.və.taɪm/"),
          e("customer", "khách hàng", "/ˈkʌs.tə.mər/"),
          e("schedule", "lịch làm việc", "/ˈʃed.juːl/"),
          e("report", "báo cáo", "/rɪˈpɔːt/"),
          e("budget", "ngân sách", "/ˈbʌdʒ.ɪt/"),
          e("project", "dự án", "/ˈprɒdʒ.ekt/"),
        ]),
        L("hard", "Nâng cao", [
          p("I'm swamped with work this week.", "Tuần này tôi ngập đầu công việc."),
          p("Let's touch base tomorrow morning.", "Sáng mai ta trao đổi lại nhé."),
          p("We need to meet the deadline.", "Chúng ta phải kịp hạn chót."),
          p("He got promoted to team leader.", "Anh ấy được thăng chức trưởng nhóm."),
          p("Could you cover for me on Friday?", "Bạn làm thay tôi thứ Sáu được không?"),
          p("I'm working from home today.", "Hôm nay tôi làm việc ở nhà."),
          p("Let's wrap up the meeting.", "Kết thúc cuộc họp thôi."),
          p("She handed in her resignation.", "Cô ấy đã nộp đơn xin nghỉ việc."),
        ]),
      ]),

      /* ================= 5. MÔI TRƯỜNG ================= */
      T("environment", "🌱", "Môi trường & thiên nhiên", "Thời tiết, ô nhiễm, động thực vật", [
        L("basic", "Cơ bản", [
          e("tree", "cái cây", "/triː/"),
          e("water", "nước", "/ˈwɔː.tər/"),
          e("air", "không khí", "/eər/"),
          e("sun", "mặt trời", "/sʌn/"),
          e("rain", "mưa", "/reɪn/"),
          e("river", "con sông", "/ˈrɪv.ər/"),
          e("sea", "biển", "/siː/"),
          e("animal", "động vật", "/ˈæn.ɪ.məl/"),
          e("flower", "bông hoa", "/ˈflaʊ.ər/"),
          e("forest", "khu rừng", "/ˈfɒr.ɪst/"),
        ]),
        L("medium", "Trung cấp", [
          e("pollution", "sự ô nhiễm", "/pəˈluː.ʃən/"),
          e("recycle", "tái chế", "/ˌriːˈsaɪ.kəl/"),
          e("plastic", "nhựa", "/ˈplæs.tɪk/"),
          e("energy", "năng lượng", "/ˈen.ə.dʒi/"),
          e("climate", "khí hậu", "/ˈklaɪ.mət/"),
          e("waste", "rác thải", "/weɪst/"),
          e("renewable", "có thể tái tạo", "/rɪˈnjuː.ə.bəl/"),
          e("ecosystem", "hệ sinh thái", "/ˈiː.kəʊˌsɪs.təm/"),
          e("drought", "hạn hán", "/draʊt/"),
          e("flood", "lũ lụt", "/flʌd/"),
        ]),
        L("hard", "Nâng cao", [
          p("We should cut down on plastic waste.", "Chúng ta nên giảm rác thải nhựa."),
          p("Climate change affects everyone.", "Biến đổi khí hậu ảnh hưởng tới tất cả mọi người."),
          p("Solar power is a renewable energy source.", "Năng lượng mặt trời là nguồn năng lượng tái tạo."),
          p("Many species are on the verge of extinction.", "Nhiều loài đang trên bờ vực tuyệt chủng."),
          p("Let's plant more trees in the neighborhood.", "Hãy trồng thêm cây trong khu phố."),
          p("The river is heavily polluted.", "Con sông bị ô nhiễm nặng."),
          p("We must protect the rainforest.", "Chúng ta phải bảo vệ rừng nhiệt đới."),
          p("Turn off the lights to save energy.", "Tắt đèn để tiết kiệm năng lượng."),
        ]),
      ]),

      /* ================= 6. DU LỊCH ================= */
      T("travel", "✈️", "Du lịch & di chuyển", "Sân bay, khách sạn, đường đi", [
        L("basic", "Cơ bản", [
          e("airport", "sân bay", "/ˈeə.pɔːt/"),
          e("ticket", "vé", "/ˈtɪk.ɪt/"),
          e("bus", "xe buýt", "/bʌs/"),
          e("train", "tàu hỏa", "/treɪn/"),
          e("hotel", "khách sạn", "/həʊˈtel/"),
          e("map", "bản đồ", "/mæp/"),
          e("luggage", "hành lý", "/ˈlʌɡ.ɪdʒ/"),
          e("passport", "hộ chiếu", "/ˈpɑːs.pɔːt/"),
          e("beach", "bãi biển", "/biːtʃ/"),
          e("bridge", "cây cầu", "/brɪdʒ/"),
        ]),
        L("medium", "Trung cấp", [
          e("destination", "điểm đến", "/ˌdes.tɪˈneɪ.ʃən/"),
          e("itinerary", "lịch trình", "/aɪˈtɪn.ər.ər.i/"),
          e("departure", "sự khởi hành", "/dɪˈpɑː.tʃər/"),
          e("arrival", "sự đến nơi", "/əˈraɪ.vəl/"),
          e("reservation", "sự đặt chỗ", "/ˌrez.əˈveɪ.ʃən/"),
          e("tourist", "du khách", "/ˈtʊə.rɪst/"),
          e("currency", "tiền tệ", "/ˈkʌr.ən.si/"),
          e("customs", "hải quan", "/ˈkʌs.təmz/"),
          e("delay", "sự trì hoãn", "/dɪˈleɪ/"),
          e("transfer", "sự trung chuyển", "/trænsˈfɜːr/"),
        ]),
        L("hard", "Nâng cao", [
          p("I'd like to book a room for two nights.", "Tôi muốn đặt phòng hai đêm."),
          p("What time does the flight take off?", "Mấy giờ máy bay cất cánh?"),
          p("Could you show me on the map?", "Bạn chỉ giúp tôi trên bản đồ được không?"),
          p("Is breakfast included in the price?", "Giá có gồm bữa sáng không?"),
          p("We got lost on the way to the hotel.", "Chúng tôi bị lạc đường tới khách sạn."),
          p("The flight was delayed by two hours.", "Chuyến bay bị hoãn hai tiếng."),
          p("I'm travelling light this time.", "Lần này tôi đi nhẹ thôi."),
          p("Let's take a guided tour of the old town.", "Hãy đi tour có hướng dẫn viên ở phố cổ."),
        ]),
      ]),

      /* ================= 7. ẨM THỰC ================= */
      T("food", "🍜", "Ẩm thực & nhà hàng", "Món ăn, nguyên liệu, gọi món", [
        L("basic", "Cơ bản", [
          e("rice", "cơm / gạo", "/raɪs/"),
          e("bread", "bánh mì", "/bred/"),
          e("egg", "quả trứng", "/eɡ/"),
          e("meat", "thịt", "/miːt/"),
          e("fish", "cá", "/fɪʃ/"),
          e("soup", "món súp", "/suːp/"),
          e("milk", "sữa", "/mɪlk/"),
          e("sugar", "đường", "/ˈʃʊɡ.ər/"),
          e("salt", "muối", "/sɔːlt/"),
          e("fruit", "trái cây", "/fruːt/"),
        ]),
        L("medium", "Trung cấp", [
          e("ingredient", "nguyên liệu", "/ɪnˈɡriː.di.ənt/"),
          e("recipe", "công thức nấu ăn", "/ˈres.ɪ.pi/"),
          e("dessert", "món tráng miệng", "/dɪˈzɜːt/"),
          e("appetizer", "món khai vị", "/ˈæp.ɪ.taɪ.zər/"),
          e("spicy", "cay", "/ˈspaɪ.si/"),
          e("salty", "mặn", "/ˈsɔːl.ti/"),
          e("sour", "chua", "/saʊər/"),
          e("delicious", "ngon", "/dɪˈlɪʃ.əs/"),
          e("vegetarian", "ăn chay", "/ˌvedʒ.əˈteə.ri.ən/"),
          e("takeaway", "món mang về", "/ˈteɪk.ə.weɪ/"),
        ]),
        L("hard", "Nâng cao", [
          p("Could I have the bill, please?", "Cho tôi xin hóa đơn."),
          p("I'm allergic to peanuts.", "Tôi bị dị ứng với đậu phộng."),
          p("This dish is a bit too salty for me.", "Món này hơi mặn với tôi."),
          p("What do you recommend?", "Bạn gợi ý món gì?"),
          p("I'll have the same, please.", "Cho tôi cũng món đó."),
          p("Let's grab a bite on the way home.", "Trên đường về nhà, ăn chút gì đó đi."),
          p("She's a picky eater.", "Cô ấy khó tính chuyện ăn uống."),
          p("The food here is out of this world.", "Đồ ăn ở đây ngon tuyệt vời."),
        ]),
      ]),

      /* ================= 8. SỨC KHỎE ================= */
      T("health", "🩺", "Sức khỏe & cơ thể", "Bộ phận cơ thể, bệnh, đi khám", [
        L("basic", "Cơ bản", [
          e("head", "cái đầu", "/hed/"),
          e("hand", "bàn tay", "/hænd/"),
          e("eye", "mắt", "/aɪ/"),
          e("doctor", "bác sĩ", "/ˈdɒk.tər/"),
          e("medicine", "thuốc", "/ˈmed.ɪ.sən/"),
          e("sick", "bị ốm", "/sɪk/"),
          e("pain", "cơn đau", "/peɪn/"),
          e("hospital", "bệnh viện", "/ˈhɒs.pɪ.təl/"),
          e("healthy", "khỏe mạnh", "/ˈhel.θi/"),
          e("sleep", "giấc ngủ", "/sliːp/"),
        ]),
        L("medium", "Trung cấp", [
          e("symptom", "triệu chứng", "/ˈsɪmp.təm/"),
          e("fever", "sốt", "/ˈfiː.vər/"),
          e("cough", "ho", "/kɒf/"),
          e("headache", "đau đầu", "/ˈhed.eɪk/"),
          e("injury", "chấn thương", "/ˈɪn.dʒər.i/"),
          e("treatment", "điều trị", "/ˈtriːt.mənt/"),
          e("prescription", "đơn thuốc", "/prɪˈskrɪp.ʃən/"),
          e("exercise", "tập thể dục", "/ˈek.sə.saɪz/"),
          e("stress", "căng thẳng", "/stres/"),
          e("recovery", "sự hồi phục", "/rɪˈkʌv.ər.i/"),
        ]),
        L("hard", "Nâng cao", [
          p("I don't feel well today.", "Hôm nay tôi thấy không khỏe."),
          p("You should see a doctor right away.", "Bạn nên đi khám ngay."),
          p("I've had a sore throat for three days.", "Tôi bị đau họng ba ngày nay."),
          p("Take this medicine twice a day.", "Uống thuốc này hai lần một ngày."),
          p("Regular exercise keeps you healthy.", "Tập thể dục đều đặn giúp bạn khỏe mạnh."),
          p("He's recovering from a broken leg.", "Anh ấy đang hồi phục sau khi gãy chân."),
          p("Try to get enough sleep every night.", "Cố ngủ đủ giấc mỗi đêm."),
          p("My back hurts when I sit too long.", "Lưng tôi đau khi ngồi quá lâu."),
        ]),
      ]),

      /* ================= 9. CÔNG NGHỆ ================= */
      T("tech", "💻", "Công nghệ & internet", "Máy tính, ứng dụng, mạng", [
        L("basic", "Cơ bản", [
          e("phone", "điện thoại", "/fəʊn/"),
          e("computer", "máy tính", "/kəmˈpjuː.tər/"),
          e("internet", "mạng internet", "/ˈɪn.tə.net/"),
          e("website", "trang web", "/ˈweb.saɪt/"),
          e("password", "mật khẩu", "/ˈpɑːs.wɜːd/"),
          e("screen", "màn hình", "/skriːn/"),
          e("keyboard", "bàn phím", "/ˈkiː.bɔːd/"),
          e("file", "tệp tin", "/faɪl/"),
          e("download", "tải xuống", "/ˌdaʊnˈləʊd/"),
          e("message", "tin nhắn", "/ˈmes.ɪdʒ/"),
        ]),
        L("medium", "Trung cấp", [
          e("software", "phần mềm", "/ˈsɒft.weər/"),
          e("hardware", "phần cứng", "/ˈhɑːd.weər/"),
          e("update", "cập nhật", "/ʌpˈdeɪt/"),
          e("backup", "bản sao lưu", "/ˈbæk.ʌp/"),
          e("network", "mạng lưới", "/ˈnet.wɜːk/"),
          e("device", "thiết bị", "/dɪˈvaɪs/"),
          e("application", "ứng dụng", "/ˌæp.lɪˈkeɪ.ʃən/"),
          e("cloud", "điện toán đám mây", "/klaʊd/"),
          e("security", "bảo mật", "/sɪˈkjʊə.rə.ti/"),
          e("algorithm", "thuật toán", "/ˈæl.ɡə.rɪ.ðəm/"),
        ]),
        L("hard", "Nâng cao", [
          p("My laptop keeps crashing.", "Laptop của tôi cứ bị treo."),
          p("Don't forget to back up your data.", "Đừng quên sao lưu dữ liệu."),
          p("The app is not responding.", "Ứng dụng không phản hồi."),
          p("You need to update the software.", "Bạn cần cập nhật phần mềm."),
          p("Can you send me the file by email?", "Bạn gửi tôi tệp qua email được không?"),
          p("The Wi-Fi signal is really weak here.", "Sóng Wi-Fi ở đây rất yếu."),
          p("Two-factor authentication keeps accounts safe.", "Xác thực hai lớp giúp tài khoản an toàn."),
          p("I forgot my password again.", "Tôi lại quên mật khẩu rồi."),
        ]),
      ]),

      /* ================= 10. CẢM XÚC ================= */
      T("emotion", "😊", "Cảm xúc & tính cách", "Vui buồn, lo lắng, tự tin", [
        L("basic", "Cơ bản", [
          e("happy", "vui vẻ", "/ˈhæp.i/"),
          e("sad", "buồn", "/sæd/"),
          e("angry", "tức giận", "/ˈæŋ.ɡri/"),
          e("tired", "mệt mỏi", "/ˈtaɪəd/"),
          e("excited", "hào hứng", "/ɪkˈsaɪ.tɪd/"),
          e("afraid", "sợ hãi", "/əˈfreɪd/"),
          e("bored", "chán", "/bɔːd/"),
          e("calm", "bình tĩnh", "/kɑːm/"),
          e("love", "tình yêu", "/lʌv/"),
          e("worry", "lo lắng", "/ˈwʌr.i/"),
        ]),
        L("medium", "Trung cấp", [
          e("nervous", "hồi hộp", "/ˈnɜː.vəs/"),
          e("jealous", "ghen tị", "/ˈdʒel.əs/"),
          e("proud", "tự hào", "/praʊd/"),
          e("embarrassed", "xấu hổ", "/ɪmˈbær.əst/"),
          e("grateful", "biết ơn", "/ˈɡreɪt.fəl/"),
          e("disappointed", "thất vọng", "/ˌdɪs.əˈpɔɪn.tɪd/"),
          e("curious", "tò mò", "/ˈkjʊə.ri.əs/"),
          e("confident", "tự tin", "/ˈkɒn.fɪ.dənt/"),
          e("lonely", "cô đơn", "/ˈləʊn.li/"),
          e("patient", "kiên nhẫn", "/ˈpeɪ.ʃənt/"),
        ]),
        L("hard", "Nâng cao", [
          p("I'm over the moon about the news.", "Tôi mừng phát điên với tin này."),
          p("She was on the verge of tears.", "Cô ấy suýt khóc."),
          p("He's in a good mood today.", "Hôm nay tâm trạng anh ấy tốt."),
          p("Don't be so hard on yourself.", "Đừng khắt khe với bản thân quá."),
          p("I'm a bit nervous about the interview.", "Tôi hơi lo lắng về buổi phỏng vấn."),
          p("Try to keep calm and carry on.", "Hãy bình tĩnh và tiếp tục."),
          p("She's proud of what she has achieved.", "Cô ấy tự hào về những gì mình đạt được."),
          p("It made my day.", "Điều đó làm tôi vui cả ngày."),
        ]),
      ]),

      /* ================= 11. MUA SẮM ================= */
      T("shopping", "🛒", "Mua sắm & tiền", "Giá cả, thanh toán, đổi trả", [
        L("basic", "Cơ bản", [
          e("shop", "cửa hàng", "/ʃɒp/"),
          e("price", "giá", "/praɪs/"),
          e("cheap", "rẻ", "/tʃiːp/"),
          e("expensive", "đắt", "/ɪkˈspen.sɪv/"),
          e("buy", "mua", "/baɪ/"),
          e("sell", "bán", "/sel/"),
          e("cash", "tiền mặt", "/kæʃ/"),
          e("card", "thẻ", "/kɑːd/"),
          e("size", "kích cỡ", "/saɪz/"),
          e("bag", "cái túi", "/bæɡ/"),
        ]),
        L("medium", "Trung cấp", [
          e("discount", "giảm giá", "/ˈdɪs.kaʊnt/"),
          e("receipt", "hóa đơn", "/rɪˈsiːt/"),
          e("refund", "hoàn tiền", "/ˈriː.fʌnd/"),
          e("exchange", "đổi hàng", "/ɪksˈtʃeɪndʒ/"),
          e("brand", "thương hiệu", "/brænd/"),
          e("product", "sản phẩm", "/ˈprɒd.ʌkt/"),
          e("queue", "hàng chờ", "/kjuː/"),
          e("sale", "đợt giảm giá", "/seɪl/"),
          e("warranty", "bảo hành", "/ˈwɒr.ən.ti/"),
          e("bargain", "món hời", "/ˈbɑː.ɡɪn/"),
        ]),
        L("hard", "Nâng cao", [
          p("How much does this cost?", "Cái này giá bao nhiêu?"),
          p("Do you have this in a larger size?", "Cái này có cỡ lớn hơn không?"),
          p("Can I try it on?", "Tôi mặc thử được không?"),
          p("I'd like to return this item.", "Tôi muốn trả lại món này."),
          p("Is there a discount on this?", "Cái này có giảm giá không?"),
          p("I'm just browsing, thanks.", "Tôi chỉ xem thôi, cảm ơn."),
          p("Could I have a receipt, please?", "Cho tôi xin hóa đơn được không?"),
          p("It's on sale until Sunday.", "Nó được giảm giá đến Chủ nhật."),
        ]),
      ]),

      /* ================= 12. THỂ THAO ================= */
      T("sport", "⚽", "Thể thao & giải trí", "Trận đấu, sở thích, thư giãn", [
        L("basic", "Cơ bản", [
          e("ball", "quả bóng", "/bɔːl/"),
          e("run", "chạy", "/rʌn/"),
          e("swim", "bơi", "/swɪm/"),
          e("game", "trò chơi", "/ɡeɪm/"),
          e("team", "đội", "/tiːm/"),
          e("player", "cầu thủ / người chơi", "/ˈpleɪ.ər/"),
          e("win", "thắng", "/wɪn/"),
          e("lose", "thua", "/luːz/"),
          e("music", "âm nhạc", "/ˈmjuː.zɪk/"),
          e("movie", "bộ phim", "/ˈmuː.vi/"),
        ]),
        L("medium", "Trung cấp", [
          e("match", "trận đấu", "/mætʃ/"),
          e("score", "tỷ số", "/skɔːr/"),
          e("coach", "huấn luyện viên", "/kəʊtʃ/"),
          e("stadium", "sân vận động", "/ˈsteɪ.di.əm/"),
          e("referee", "trọng tài", "/ˌref.əˈriː/"),
          e("champion", "nhà vô địch", "/ˈtʃæm.pi.ən/"),
          e("tournament", "giải đấu", "/ˈtʊə.nə.mənt/"),
          e("hobby", "sở thích", "/ˈhɒb.i/"),
          e("fan", "người hâm mộ", "/fæn/"),
          e("audience", "khán giả", "/ˈɔː.di.əns/"),
        ]),
        L("hard", "Nâng cao", [
          p("Let's go for a run in the park.", "Đi chạy bộ trong công viên đi."),
          p("Our team won the final match.", "Đội của chúng tôi thắng trận chung kết."),
          p("He's a huge football fan.", "Anh ấy là fan bóng đá cuồng nhiệt."),
          p("I play badminton twice a week.", "Tôi chơi cầu lông hai lần một tuần."),
          p("The stadium was packed with fans.", "Sân vận động chật kín người hâm mộ."),
          p("She broke the national record.", "Cô ấy phá kỷ lục quốc gia."),
          p("Do you want to watch a movie tonight?", "Tối nay bạn có muốn xem phim không?"),
          p("Practice hard and you will improve.", "Luyện tập chăm chỉ rồi bạn sẽ tiến bộ."),
        ]),
      ]),
    ],
  };
})();
