const SLACK_BOT_TOKEN = Deno.env.get("SLACK_TOKEN") || "";
const CHANNEL_ID = Deno.env.get("SLACK_CHANNEL") || "C6XNQB6LB";

if (!SLACK_BOT_TOKEN || !CHANNEL_ID) throw new Error("Tumakia");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const kv = await Deno.openKv();

Deno.cron("Send daily challenge", "5 0 * * *", async () => {
    await sendDailyProblem();
});

////////////////////////////////////////////////////////////////

type AccountMap = {
    [key: string]: string
};

type Question = {
    questionId: number;
    questionFrontendId: number;
    title: string;
    titleSlug: string;
    difficulty: string;
    acRate: number;
};

type DailyQuestion = {
    date: string;
    userStatus: string;
    link: string;
    question: Question;
};

const langEmojiMap = {
    'rust': ':rust:',
    'java': ':java:',
    'golang': ':golang:',
    'python': ':lang-python:',
    'python3': ':lang-python:',
    'ruby': ':ruby:',
    'javascript': ':js:',
    'swift': ':lang-swift:',
};

const QUESTION_SETS = {
    "GOOGLE": [683, 388, 308, 681, 843, 818, 366, 489, 1057, 359, 929, 1007, 1153, 288, 2096, 1293, 562, 418, 1088,
        1610, 727, 1, 482, 544, 158, 833, 753, 351, 809, 2158, 642, 1146, 298, 2034, 904, 975, 361, 1066, 340,
        777, 939, 1110, 299, 253, 393, 679, 1231, 159, 425, 246, 294, 568, 1937, 729, 715, 1240, 900, 1548, 394,
        200, 68, 1055, 280, 803, 329, 281, 163, 315, 1376, 1048, 157, 379, 528, 616, 844, 951, 218, 1087, 737,
        1032, 56, 317, 399, 410, 42, 465, 444, 284, 346, 360, 320, 690, 524, 1096, 406, 837, 247, 552, 774, 734,
        686, 302, 305, 353, 792, 2007, 913, 857, 593, 1277, 296, 1423, 146, 269, 1618, 362, 659, 271, 1834, 1138,
        849, 1145, 85, 2, 2402, 1254, 947, 549, 1706, 407, 527, 2013, 2458, 1168, 384, 1477, 2162, 4, 1170, 363,
        149, 1136, 539, 2713, 1197, 2115, 731, 1499, 403, 1244, 490, 417, 276, 759, 1825, 369, 1966, 295, 871,
        17, 687, 772, 800, 1406, 2242, 447, 788, 375, 2135, 428, 222, 2101, 419, 963, 289, 10, 221, 604, 140,
        752, 150, 505, 2178, 166, 1368, 23, 1438, 354, 766, 1504, 911, 2421, 2700, 259, 297, 745, 3, 5, 66, 1525,
        224, 935, 981, 13, 695, 332, 336, 1345, 855, 732, 1776, 1592, 139, 1352, 279, 1296, 894, 62, 1102, 226,
        2366, 391, 239, 692, 293, 365, 341, 15, 337, 497, 249, 609, 652, 1292, 2172, 835, 726, 57, 1074, 41,
        1056, 127, 1237, 91, 400, 380, 76, 840, 128, 20, 767, 1101, 846, 1377, 278, 702, 587, 1526, 241, 22, 710,
        54, 208, 636, 212, 124, 934, 11, 53, 31, 37, 411, 2416, 215, 43, 778, 853, 318, 324, 356, 463, 808, 38,
        202, 721, 282, 460, 316, 358, 1996, 370, 486, 173, 551, 210, 889, 458, 34, 1263, 2188, 252, 420, 7, 1024,
        401, 1631, 459, 286, 1219, 932, 1632, 968, 72, 228, 79, 1564, 266, 121, 815, 847, 300, 1218, 33, 14, 84,
        758, 205, 1044, 834, 588, 743, 50, 1207, 2018, 223, 560, 2174, 839, 676, 685, 48, 18, 133, 973, 187, 845,
        348, 168, 162, 1320, 378, 776, 708, 769, 621, 1770, 1105, 70, 287, 498, 64, 198, 96, 251, 137, 261, 301,
        138, 1000, 2667, 44, 949, 236, 273, 448, 469, 1858, 484, 1444, 32, 1272, 229, 475, 21, 852, 347, 211,
        233, 424, 1094, 207, 415, 979, 322, 862, 174, 1642, 954, 345, 535, 2437, 395, 940, 2235, 890, 1165, 1483,
        134, 990, 49, 155, 1387, 1606, 220, 1553, 9, 1235, 274, 240, 312, 480, 542, 71, 1506, 126, 887, 327,
        1885, 1014, 135, 97, 206, 8, 214, 1314, 832, 2842, 36, 427, 2337, 334, 193, 1233, 46, 412, 1820, 1121,
        1728, 2936, 875, 2271, 227, 2332, 1730, 63, 1091, 143, 719, 310, 116, 1206, 980, 2092, 684, 658, 118,
        343, 2407, 25, 55, 270, 115, 389, 735, 1793, 760, 88, 382, 2184, 438, 264, 283, 442, 977, 2265, 1756,
        518, 95, 78, 1697, 799, 830, 543, 1062, 941, 323, 1970, 238, 98, 29, 501, 1286, 733, 665, 914, 564, 1275,
        1011, 878, 2025, 69, 387, 2258, 93, 392, 344, 188, 373, 51, 421, 1036, 89, 655, 1987, 213, 45, 1155, 416,
        12, 2305, 919, 1480, 131, 1268, 217, 806, 540, 1307, 1740, 1162, 787, 349, 938, 741, 1866, 16, 1027, 169,
        864, 771, 1658, 2131, 94, 101, 1807, 2088, 234, 39, 525, 152, 104, 1326, 1616, 2316, 67, 1125, 2035, 190,
        446, 556, 739, 1255, 782, 1494, 2313, 136, 303, 409, 99, 1220, 167, 105, 209, 2103, 2345, 1854, 644, 909,
        368, 756, 2276, 102, 1316, 309, 26, 647, 1386, 1768, 100, 30, 748],
    "FACEBOOK": [1249, 953, 301, 314, 680, 1570, 158, 1762, 1428, 273, 1650, 339, 408, 528, 973, 426, 227, 938, 560,
        157, 311, 269, 415, 253, 65, 215, 67, 636, 71, 282, 249, 670, 236, 297, 523, 317, 56, 173, 986, 278, 1891, 791,
        921, 708, 325, 621, 398, 23, 246, 199, 31, 140, 91, 50, 498, 346, 304, 689, 270, 543, 721, 10, 138, 146, 133,
        616, 211, 125, 76, 987, 161, 238, 766, 200, 15, 827, 29, 438, 124, 266, 348, 1060, 139, 283, 42, 489, 1091, 34,
        162, 277, 347, 341, 17, 88, 43, 163, 536, 825, 824, 896, 286, 691, 247, 129, 1, 863, 1047, 1216, 1197, 78, 597,
        529, 257, 114, 1522, 419, 378, 463, 1344, 98, 2060, 977, 658, 285, 515, 958, 772, 865, 380, 1123, 1213, 33, 785,
        224, 8, 393, 647, 695, 1209, 349, 329, 333, 381, 1539, 127, 1868, 20, 767, 121, 296, 1424, 116, 1206, 490, 622,
        1004, 79, 332, 1382, 934, 38, 1026, 480, 556, 468, 143, 674, 319, 3, 545, 2, 252, 692, 494, 694, 32, 126, 53, 5,
        13, 218, 477, 16, 22, 207, 394, 416, 1011, 19, 39, 295, 4, 239, 642, 406, 1644, 212, 46, 525, 983, 21, 1113,
        724, 727, 49, 57, 111, 1541, 51, 1944, 1142, 1094, 103, 1242, 300, 428, 93, 14, 919, 102, 778, 1305, 54, 68,
        1245, 1439, 92, 1559, 117, 739, 75, 637, 234, 384, 1132, 11, 206, 1740, 1110, 399, 430, 240, 1498, 219, 230,
        105, 323, 387, 62, 41, 303, 1055, 678, 24, 676, 203, 44, 73, 271, 113, 235, 388, 1460, 208, 48, 25, 350, 617,
        18, 223, 267, 74, 122, 1264, 443, 1443, 435, 209, 460, 241, 26, 540, 1331, 63, 639, 605, 210, 128, 153, 84,
        1361, 1161, 160, 47, 7, 763, 1293, 85, 2365, 72, 688, 36, 554, 437, 148, 112, 974, 1287, 836, 66, 101, 698,
        1454, 706, 711, 703, 593, 503, 55, 1322, 94, 191, 28, 151, 334, 442, 90, 875, 852, 687, 1029, 152, 572, 265,
        260, 242, 1379, 1973, 322, 496, 538, 857, 367, 2667, 40, 993, 735, 1353, 155, 69, 1008, 1854, 1398, 715, 1445,
        310, 328, 905, 198, 578, 377, 287, 602, 461, 1108, 518, 1757, 787, 581, 299, 131, 1373, 136, 95, 417, 12, 410,
        662, 1186, 404, 70, 150, 2210, 713, 779, 145, 6, 448, 45, 168, 167, 9, 633, 1241, 189, 261, 2265, 268, 1013,
        344, 750, 190, 1352, 2096, 547, 100, 424, 1122, 104, 188, 110, 2303, 450, 337, 1586, 904, 383, 412, 2281, 1748,
        1043, 289, 402, 169, 1225, 118, 918, 704, 995, 262, 135, 968, 535, 733, 217, 989, 1002, 1778, 202, 451, 1963,
        392, 221, 386, 130, 797, 557],
    "AMAZON": [937, 2272, 1041, 200, 146, 1192, 1152, 828, 2281, 819, 973, 1, 472, 957, 763, 253, 42, 1465, 1335, 642,
        138, 5, 2214, 1268, 1710, 23, 692, 1010, 588, 127, 140, 273, 994, 1167, 295, 926, 348, 2, 1597, 297, 56, 269,
        1628, 696, 212, 545, 767, 460, 17, 21, 239, 4, 3, 863, 1567, 1120, 139, 20, 103, 2781, 694, 121, 53, 572, 49,
        79, 240, 772, 2104, 15, 2355, 1044, 54, 449, 277, 210, 380, 1730, 11, 126, 323, 445, 236, 675, 165, 155, 207,
        1102, 48, 41, 362, 33, 1972, 22, 13, 12, 2055, 315, 227, 1135, 1429, 490, 215, 909, 695, 238, 2193, 116, 1000,
        347, 322, 84, 25, 221, 2340, 341, 76, 224, 91, 1099, 438, 1603, 340, 218, 632, 387, 98, 2262, 124, 31, 733, 547,
        895, 560, 2222, 99, 394, 134, 706, 289, 535, 1279, 55, 314, 45, 206, 716, 688, 818, 36, 1197, 105, 2102, 815,
        907, 403, 287, 2268, 489, 505, 1353, 143, 1492, 32, 987, 378, 70, 51, 556, 243, 1155, 14, 74, 117, 78, 442, 10,
        109, 18, 286, 208, 88, 93, 503, 149, 735, 399, 1344, 538, 836, 234, 2398, 1481, 564, 102, 332, 529, 46, 252,
        1275, 1479, 62, 719, 101, 16, 7, 543, 739, 2357, 496, 199, 316, 336, 198, 179, 122, 640, 1091, 420, 1209, 24,
        1244, 337, 1094, 135, 1360, 128, 329, 407, 1235, 711, 366, 64, 698, 92, 381, 8, 223, 663, 123, 96, 2221, 406,
        301, 211, 152, 173, 50, 177, 268, 603, 72, 150, 118, 992, 19, 34, 993, 983, 540, 1100, 871, 981, 279, 852, 133,
        456, 658, 39, 1011, 235, 721, 300, 59, 176, 528, 346, 85, 428, 622, 901, 37, 979, 1083, 419, 2096, 1792, 1032,
        889, 159, 432, 1233, 217, 849, 703, 317, 38, 113, 1511, 73, 412, 437, 181, 1130, 417, 934, 681, 131, 6, 410,
        518, 402, 75, 193, 1864, 582, 2386, 894, 97, 636, 581, 71, 395, 752, 162, 682, 617, 160, 169, 621, 997, 185,
        1291, 430, 344, 188, 44, 312, 63, 9, 304, 161, 875, 729, 261, 443, 1339, 1293, 542, 523, 136, 232, 516, 339, 95,
        349, 1219, 262, 157, 186, 1026, 333, 2244, 226, 628, 1740, 2519, 167, 141, 498, 299, 373, 244, 1207, 1531, 108,
        779, 856, 935, 29, 57, 653, 662, 270, 114, 1249, 68, 480, 1772, 1480, 690, 797, 463, 1019, 153, 112, 278, 205,
        202, 1723, 2100, 787, 532, 137, 242, 148, 43, 754, 1038, 204, 953, 187, 230, 587, 465, 881, 823, 1110, 847,
        1143, 977, 618, 120, 1254, 557, 28, 920, 328, 354, 609, 968, 525, 974, 1569, 69, 1046, 579, 887, 426, 450, 319,
        283, 773, 647, 1002, 1405, 468, 493, 785, 424, 841, 1315, 175, 100, 508, 132, 1454, 718, 26, 652, 646, 363,
        1751, 448, 1470, 838, 81, 1345, 2294, 307, 986, 377, 1395, 359, 421, 670, 1834, 1086, 1846, 1497, 189, 1047,
        1022, 415, 257, 106, 1146, 678, 715, 104, 669, 241, 168, 1420, 1029, 1220, 83, 1202, 2219, 1062, 1214, 142, 567,
        1376, 151, 1122, 30, 2667, 67, 1438, 827, 40, 94, 184, 2385, 107, 90, 1060, 61, 1008, 371, 171, 2870, 86, 2825,
        203, 229, 904, 82, 814, 720, 130, 393, 1768, 416, 725, 905, 192, 174, 494, 2141, 665, 724, 946, 429, 110, 1383,
        826, 233, 413, 771, 1472, 742, 1889, 746, 1574, 1081, 1699, 611, 486, 1571, 1396, 2482, 876, 1326, 309, 2405,
        409, 740, 1372, 844, 509, 704, 1523, 1636, 209, 1838, 938, 2235, 47, 515, 1329, 680, 1109, 458, 1923, 1761,
        1382, 310, 2130, 129, 2256, 60, 912, 237, 1337, 2115, 386, 225, 1225, 2110, 1074, 178, 1647, 1373, 743, 1191,
        180, 475, 959, 775, 888, 1642, 2111, 318, 918, 867, 731, 1351, 35, 880, 1119, 1478, 1727, 1658, 1043, 453, 343,
        338, 65, 2551, 260, 791, 799, 66, 1082, 435, 958, 929, 502, 1811, 1312, 1706, 1498, 219, 741, 1650, 1171, 1757,
        383, 1485, 1588, 1823, 125, 707, 527, 2125, 1359]
};

const DIFFICULTY_TO_EMOJI = {
    "easy": ":easy-2:",
    "medium": ":medium-2:",
    "hard": ":hard-2:"
};

// -------- Helper functions --------
async function getLeetcodeAccountMap(): Promise<AccountMap> {
    return (await kv.get(["leetcodeMap"])).value as AccountMap ?? {};
}

async function getSubscriberAccounts(): Promise<string[]>{
    return (await kv.get(["subscriberKey"])).value as string[] ?? [];
}

async function callGraphQL(query: string, operationName: string, variables?: object) {
    const url = 'https://leetcode.com/graphql'; // Replace with your actual GraphQL endpoint
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query,
            operationName,
            variables
        }),
    });

    if (!response.ok) {
        console.error(response);
        throw new Error(`HTTP error status: ${response.status}`);
    }

    return await response.json();
}

async function getQuestionBySlug(slug: string): Promise<Question> {
    const query = `
    query questionTitle($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
            questionId
            questionFrontendId
            title
            titleSlug
            difficulty
            acRate
        }
    }
    `;
    const response = await callGraphQL(query, 'questionTitle', {titleSlug: slug});
    return response?.data?.question;
}

async function getQuestionById(id: number): Promise<Question> {
    const query = `
      query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
        problemsetQuestionList: questionList(
          categorySlug: $categorySlug
          limit: $limit
          skip: $skip
          filters: $filters
        ) {
          total: totalNum
          questions: data {
            questionId
            questionFrontendId
            title
            titleSlug
            difficulty
            acRate
          }
        }
      }
    `;

    const search = async (offset: number): Promise<Question> => {
        const variables = {
            categorySlug: "all-code-essentials",
            limit: 20,
            skip: offset,
            filters: {}
        };
        const response = await callGraphQL(query, 'problemsetQuestionList', variables);
        if (response?.data?.problemsetQuestionList?.questions?.length == 0) {
            // No more questions to search
            return null;
        }
        const question = response?.data?.problemsetQuestionList?.questions?.find(q => q.questionFrontendId == id);
        return question ?? await search(offset + 20);
    }

    return search(id - 10);
}

async function getDailyQuestion(): Promise<DailyQuestion> {
    const query = `
    query questionOfToday {
        activeDailyCodingChallengeQuestion {
            date
            userStatus
            link
            question {
                questionId
                questionFrontendId
                title
                titleSlug
                acRate
                difficulty
            }
        }}
        `;

    const result = await callGraphQL(query, 'questionOfToday');
    return result.data.activeDailyCodingChallengeQuestion;
}

function getEmojiForDifficulty(difficulty: string): string {
    return DIFFICULTY_TO_EMOJI[difficulty.toLowerCase()] ?? ":easy-2:";
}

// -------- End Helper functions --------

async function sendMessage(blocks: object) {
    // Construct the URL for the Slack API endpoint
    const url = `https://slack.com/api/chat.postMessage`;
    // Convert the blocks array to a JSON string
    const payload = JSON.stringify({channel: CHANNEL_ID, blocks});

    // Set up the HTTP POST request options
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
            "Accept": "application/json"
        },
        body: payload
    };

    try {
        // Send the HTTP request
        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            throw new Error(`HTTP error status: ${response.status}`);
        }

        // Parse the JSON response
        const jsonResponse = await response.json();

        console.log(jsonResponse);
    } catch (error) {
        console.error(error);
    }
}

async function sendDailyProblem() {
    await kv.set(["finishers"], "");

    const data = await getDailyQuestion();
    const date = new Date(data.date);
    const url = `https://leetcode.com${data.link}`;
    const questionId = data.question.questionFrontendId;
    const questionTitle = data.question.title;
    const questionTitleSlug = data.question.titleSlug;
    const title = `[${data.question.difficulty}] ${questionId}. ${questionTitle}`;
    const acRate = `${data.question.acRate.toFixed(2)}%`;
    const subscribedUsersData = await getSubscriberAccounts();
    const formattedSubscribedUsers = subscribedUsersData.map(user => `<@${user}>`).join(' ');
    const subscriberMentioningMessage = subscribedUsersData.length
                    ? `Hey ${formattedSubscribedUsers}, Zô giải lít cốt nào anh em :arggg:`
                    : "Không ai đăng ký à, vậy khỏi tag :doubt:";

    let emoji = getEmojiForDifficulty(data.question.difficulty);

    const blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": `🗓️ Leetcode Daily - ${date.toDateString()}`,
                "emoji": true
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `${emoji} *${title}*\nLink: ${url}\nAccept Rate: ${acRate}`
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "Bạn đã làm xong bài hôm nay chưa? Điểm danh nào"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
				"text": `${subscriberMentioningMessage}`
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "✅ Tui giải xong rồi!",
                        "emoji": true
                    },
                    "value": `[dl]${questionTitleSlug}`,
                    "action_id": "problem_solved"
                }
            ]
        }
    ];

    sendMessage(blocks);

    const solutionBlocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": `:solution: Solution Discuss - ${date.toDateString()}`,
                "emoji": true
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `Thread thảo luận solution cho bài *${questionId}. ${questionTitle}*`
            }
        }
    ];

    await sleep(1000);

    sendMessage(solutionBlocks);
}

async function handleSubscribe(userId: string) {
    const subscriberAccounts = await getSubscriberAccounts();

    if (userId.length == 0 || subscriberAccounts.includes(userId)) {
        return new Response(JSON.stringify({
            "response_type": "ephemeral",
            "text": "Invalid request!"
        }), {
            status: 200,
            headers: {
                "content-type": "application/json",
            },
        });
    }

    subscriberAccounts.push(userId);
    await kv.set(["subscriberKey"], subscriberAccounts);

    return new Response(JSON.stringify({
        "response_type": "ephemeral",
        "text": "Ôkê rồi nha! Giờ bạn sẽ bị dí mỗi ngày :ehehe:"
    }), {
        status: 200,
        headers: {
            "content-type": "application/json",
        },
    });
}

async function handleUnsubscribe(userId: string) {
    const subscriberAccounts = await getSubscriberAccounts();

    const index = subscriberAccounts.indexOf(userId);
    if (index === -1) {
        return new Response(JSON.stringify({
            "response_type": "ephemeral",
            "text": "Invalid request!"
        }), {
            status: 200,
            headers: {
                "content-type": "application/json",
            },
        });
    }

    subscriberAccounts.splice(index, 1);
    await kv.set(["subscriberKey"], subscriberAccounts);

    return new Response(JSON.stringify({
        "response_type": "ephemeral",
        "text": "Bạn sợ à :doubt:"
    }), {
        status: 200,
        headers: {
            "content-type": "application/json",
        },
    });
}

async function handleEnroll(payload: string) {
    const params = new URLSearchParams(payload);
    const userId = params.get("user_id");
    const leetcodeId = params.get("text");

    if (!userId || !leetcodeId) {
        return new Response(JSON.stringify({
            "response_type": "ephemeral",
            "text": "Invalid request!"
        }), {
            status: 200,
            headers: {
                "content-type": "application/json",
            },
        });
    }

    const leetcodeAccountMap = await getLeetcodeAccountMap();
    leetcodeAccountMap[userId] = leetcodeId;
    await kv.set(["leetcodeMap"], leetcodeAccountMap);

    return new Response(JSON.stringify({
        "response_type": "ephemeral",
        "text": "Ôkê rồi nha! Giờ bạn có thể điểm danh rồi đấy."
    }), {
        status: 200,
        headers: {
            "content-type": "application/json",
        },
    });
}

async function verifySubmission(requestText: string) {
    const leetcodeAccountMap = await getLeetcodeAccountMap();
    const currentFinishers = ((await kv.get(["finishers"])).value as string ?? "").split(",");
    const payload = JSON.parse(decodeURIComponent(requestText.replace("payload=", "")));
    const userId = payload.user.id;
    const responseUrl = payload.response_url;
    console.log("ACTION", payload.actions);

    if (!leetcodeAccountMap[userId]) {
        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                "text": "Algorithm Bot chưa có thông tin về account Leetcode của bạn. Vui lòng gõ lệnh `/leetcode <username leetcode của bạn>` để join trước khi điểm danh.",
                "replace_original": false
            })
        };
        await fetch(responseUrl, requestOptions);
        return new Response("Dup!", {
            status: 200,
            headers: {
                "content-type": "text/plain; charset=utf-8",
            },
        });
    }

    let acTime = new Date();
    let acLang = "Unknown";
    const action = payload.actions[0];

    if (action.action_id == 'problem_solved') {
        const slug = action.value.replace("[dl]", "").replace("[cl]", "");
        const acQuery = `
        query getACSubmissions ($username: String!, $limit: Int) {
            recentAcSubmissionList(username: $username, limit: $limit) {
                title
                titleSlug
                timestamp
                statusDisplay
                lang
            }
        }
        `;
        const result = await callGraphQL(acQuery, 'getACSubmissions', {
            username: leetcodeAccountMap[userId],
            limit: 5
        });

        const submissions = result.data.recentAcSubmissionList ?? [];
        const matching = submissions.find(sb => sb.titleSlug == slug);
        if (!matching) {
            const requestOptions = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    text: "Bạn phải giải xong bài này trên Leetcode rồi mới được điểm danh nha!",
                    "replace_original": false
                })
            };
            fetch(responseUrl, requestOptions);

            return new Response("Dup!", {
                status: 200,
                headers: {
                    "content-type": "text/plain; charset=utf-8",
                },
            });
        } else {
            acTime = new Date(+matching.timestamp * 1000);
            acLang = matching.lang?.toLowerCase() ?? "unknown";
        }
    }

    const thread_ts = payload.container.message_ts;
    const currentTime = new Date();
    const utcMidnight = new Date(currentTime.getUTCFullYear(), currentTime.getUTCMonth(), currentTime.getUTCDate());
    utcMidnight.setHours(0, 0, 0, 0);
    const diffInMilliseconds = acTime - utcMidnight;
    const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
    const hourDiff = Math.round(diffInHours);
    let message = '';

    const isDaily = action.value.indexOf("[dl]") !== -1;

    if (isDaily && currentFinishers.indexOf(userId) != -1) {
        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                text: "Điểm danh một lần thôi nha! :doubt:",
                "replace_original": false
            })
        };
        fetch(responseUrl, requestOptions);

        return new Response("Dup!", {
            status: 200,
            headers: {
                "content-type": "text/plain; charset=utf-8",
            },
        });
    }


    if (isDaily) {
        if (currentFinishers.filter(x => x.length > 0).length < 3) {
            message = `:first_place_medal: <@${userId}> đã giải xong bài!`;
        } else if (hourDiff <= 3) {
            message = `:second_place_medal: <@${userId}> đã giải xong bài!`;
        } else if (hourDiff > 3 && hourDiff <= 6) {
            message = `:third_place_medal: <@${userId}> đã giải xong bài!`;
        } else {
            message = `:kissing_heart: <@${userId}> đã nhận được một nụ hun khích lệ!`;
        }
    } else {
        message = `:white_check_mark: <@${userId}> đã giải xong bài!`;
    }

    const timeString = new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'Asia/Ho_Chi_Minh',
    }).format(acTime);

    const langEmoji = langEmojiMap[acLang] ?? ':meow_code:';

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            text: message,
            blocks: [
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": message
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": `*Language:*\n${langEmoji} ${acLang}`
                        },
                        {
                            "type": "mrkdwn",
                            "text": `*When:*\n:clock1: ${timeString}`
                        }
                    ]
                }
            ],
            "response_type": "in_channel",
            "replace_original": false,
            "thread_ts": thread_ts
        })
    };
    fetch(responseUrl, requestOptions);

    if (isDaily) {
        kv.set(["finishers"], currentFinishers.filter(x => x.length > 0).concat(userId).join(","));
    }
}

function handleInteract(requestText: string) {
    try {
        verifySubmission(requestText);

        return new Response("Cool", {
            status: 200,
            headers: {
                "content-type": "text/plain; charset=utf-8",
            },
        });
    } catch (error) {
        throw Error("Error!" + error);
    }
}

async function handleTest() {
    await sendDailyProblem();
}

async function handleChallenge(slug: string, link: string, userId: string) {
    const question = await getQuestionBySlug(slug);
    if (!question) {
        return {
            "response_type": "ephemeral",
            "text": "Không tìm thấy câu hỏi mà bạn yêu cầu! Vui lòng kiểm tra lại link."
        };
    }

    const questionId = question.questionFrontendId;
    const questionTitle = question.title;
    const title = `[${question.difficulty}] ${questionId}. ${questionTitle}`;
    const acRate = `${question.acRate.toFixed(2)}%`;

    let emoji = getEmojiForDifficulty(question.difficulty);

    const blocks = [
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `<@${userId}> đã tạo một challenge mới:`
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": `${emoji} *${title}*\nLink: ${link}\nAccept Rate: ${acRate}`
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Giải xong!",
                        "emoji": true
                    },
                    "value": `[cl]${slug}`,
                    "action_id": "problem_solved"
                }
            ]
        }
    ];

    sendMessage(blocks);

    return {
        "response_type": "ephemeral",
        "text": "Challenge started!"
    };
}

async function handlePickup(questionSet: string) {
    const availableQuestionSets = Object.keys(QUESTION_SETS);
    if (!questionSet || availableQuestionSets.indexOf(questionSet) == -1) {
        return {
            "response_type": "ephemeral",
            "text": `Hãy chọn một set câu hỏi để pickup! Valid sets: ${availableQuestionSets.join(", ")}`
        };
    }

    const questions = QUESTION_SETS[questionSet];
    const questionFrontEndId = questions[Math.floor(Math.random() * questions.length)];
    const data = await getQuestionById(questionFrontEndId);
    if (!data) {
        return {
            "response_type": "ephemeral",
            "text": "Không tìm thấy câu hỏi mà bạn yêu cầu! Vui lòng thử lại."
        };
    }
    return {
        "response_type": "ephemeral",
        "text": `Làm câu này đi: [${data.difficulty}] ${data.questionFrontendId}. ${data.title}\nhttps://leetcode.com/problems/${data.titleSlug}/`
    };
}

Deno.serve(async (req: Request) => {
    console.log("Method:", req.method);

    const url = new URL(req.url);
    console.log("Path:", url.pathname);
    console.log("Query parameters:", url.searchParams);

    if (url.pathname == '/test') {
        await handleTest();
    }

    if (url.pathname == '/interact' && req.method == 'POST') {
        const body = await req.text() || "";
        return handleInteract(body);
    }

    if (url.pathname == '/enroll' && req.method == 'POST') {
        const body = await req.text();
        return await handleEnroll(body);
    }

    if (url.pathname == "/subscribe" && req.method == 'POST') {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const userId = params.get('user_id') ?? "";
        return await handleSubscribe(userId);
    }

    if (url.pathname == "/unsubscribe" && req.method == 'POST') {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const userId = params.get('user_id') ?? "";
        return await handleUnsubscribe(userId);
    }

    if (url.pathname == '/challenge' && req.method == 'POST') {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const userId = params.get('user_id') ?? "";
        // Example: https://leetcode.com/problems/balance-a-binary-search-tree/
        const link = params.get('text') ?? "";

        if (link.indexOf("leetcode.com") !== -1) {
            const slug = link.replace("https://leetcode.com/problems/", "")
                .replace("description/", "")
                .replace("/", "");

            if (!slug) {
                return new Response(JSON.stringify({
                    "response_type": "ephemeral",
                    "text": "Không tìm thấy câu hỏi mà bạn yêu cầu! Vui lòng kiểm tra lại link."
                }), {
                    status: 200,
                    headers: {
                        "content-type": "application/json",
                    },
                });
            }

            const responseContent = await handleChallenge(slug, link, userId);
            return new Response(JSON.stringify(responseContent), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                }
            });
        } else {
            const responseContent = await handlePickup(link);
            return new Response(JSON.stringify(responseContent), {
                status: 200,
                headers: {
                    "content-type": "application/json",
                }
            });
        }
    }

    return new Response("Hello, world", {
        status: 200,
        headers: {
            "content-type": "text/plain; charset=utf-8",
        },
    });
});
