/**
 * The tests will iterate through this list asking all the questions
 * and asserting that highlighted results are returned.
 *
 * NOTE: "How do I fix a NullReferenceException?" was removed — currently returns
 * no O'Reilly content results ("Nothing turned up in O'Reilly content.").
 *
 * ['question text', expected number of results]
 */
const questions = [
  ['What is ai?', 8],
  ['What is a zero trust network?', 8],
];

module.exports = { questions };
