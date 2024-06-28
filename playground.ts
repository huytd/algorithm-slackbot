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

// const acQuery = `
// query getACSubmissions ($username: String!, $limit: Int) {
//     recentAcSubmissionList(username: $username, limit: $limit) {
//         title
//         titleSlug
//         timestamp
//         statusDisplay
//         lang
//     }
// }
// `;
// const result = await callGraphQL(acQuery, 'getACSubmissions', {
//     username: 'huytd189',
//     limit: 5
// });
//

const contentQuery = `
    query questionContent($titleSlug: String!) {  question(titleSlug: $titleSlug) {    content    mysqlSchemas    dataSchemas  }}
`;
const result = await callGraphQL(contentQuery, 'questionContent', {
    titleSlug: 'add-bold-tag-in-string'
});
console.log(result);

/*
result.data.question
questionId
title
difficulty
acRate
*/
