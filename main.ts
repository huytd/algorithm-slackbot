const SLACK_BOT_TOKEN = Deno.env.get("SLACK_TOKEN") || "";
const CHANNEL_ID = "C6XNQB6LB";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const kv = await Deno.openKv();

Deno.cron("Send daily challenge", "5 0 * * *", async () => {
    await sendDailyProblem();
});

////////////////////////////////////////////////////////////////

type AccountMap = {
    [key: string]: string
};

const langEmojiMap = {
    'rust': ':rust:',
    'java': ':java:',
    'golang': ':golang:',
    'python': ':lang-python:',
    'python3': ':lang-python:',
    'ruby': ':ruby:',
    'javascript': ':js:',
};

async function getLeetcodeAccountMap(): Promise<AccountMap> {
    return (await kv.get(["leetcodeMap"])).value as AccountMap ?? {};
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

async function sendMessage(blocks: object) {
    // Construct the URL for the Slack API endpoint
    const url = `https://slack.com/api/chat.postMessage`;
    // Convert the blocks array to a JSON string
    const payload = JSON.stringify({ channel: CHANNEL_ID, blocks });

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

    const query = `
    query questionOfToday {
        activeDailyCodingChallengeQuestion {
            date
            userStatus
            link
            question {
                acRate
                difficulty
                freqBar
                frontendQuestionId: questionFrontendId
                isFavor
                paidOnly: isPaidOnly
                status
                title
                titleSlug
                hasVideoSolution
                hasSolution
                topicTags {
                    name
                    id
                    slug
                }
            }
        }}
        `;

        const result = await callGraphQL(query, 'questionOfToday');
        const data = result.data.activeDailyCodingChallengeQuestion;
        const date = new Date(data.date);
        const url = `https://leetcode.com${data.link}`;
        const questionId = data.question.frontendQuestionId;
        const questionTitle = data.question.title;
        const questionTitleSlug = data.question.titleSlug;
        const title = `[${data.question.difficulty}] ${questionId}. ${questionTitle}`;
        const acRate = `${data.question.acRate.toFixed(2)}%`;
        let emoji = ":easy-2:";
        switch (data.question.difficulty.toLowerCase()) {
            case 'medium':
                emoji = ":medium-2:";
            break;
            case 'hard':
                emoji = ":hard-2:"
            break;
        }

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

async function handleChallenge(payload: string) {
    const params = new URLSearchParams(payload);
    // Example: https://leetcode.com/problems/balance-a-binary-search-tree/
    const link = params.get('text') ?? "";
    const userId = params.get('user_id') ?? "";
    const slug = link.replace("https://leetcode.com/problems/", "").replace("/", "");

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
    const result = await callGraphQL(query, 'questionTitle', {
        titleSlug: slug
    });

    const data = result?.data?.question;
    if (!data) {
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

    const questionId = data.questionId;
    const questionTitle = data.title;
    const title = `[${data.difficulty}] ${questionId}. ${questionTitle}`;
    const acRate = `${data.acRate.toFixed(2)}%`;

    let emoji = ":easy-2:";
    switch (data.difficulty.toLowerCase()) {
        case 'medium':
            emoji = ":medium-2:";
        break;
        case 'hard':
            emoji = ":hard-2:"
        break;
    }

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

    return new Response(JSON.stringify({
        "response_type": "ephemeral",
        "text": "Challenge started!"
    }), {
        status: 200,
        headers: {
            "content-type": "application/json",
        },
    });
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

    if (url.pathname == '/challenge' && req.method == 'POST') {
        const body = await req.text();
        return await handleChallenge(body);
    }

    return new Response("Hello, world", {
        status: 200,
        headers: {
            "content-type": "text/plain; charset=utf-8",
        },
    });
});

