const deepSeekService = require('./src/services/deepseekService');

async function testQuestionTypes() {
    const sampleText = `
    JavaScript is a programming language that is primarily used for web development. 
    It was created by Brendan Eich in 1995. JavaScript can be used for both frontend 
    and backend development. Some key features include variables, functions, objects, 
    and arrays. JavaScript is an interpreted language that runs in web browsers.
    `;

    console.log('Testing question type generation...\n');

    try {
        console.log('Requested question types:', ['multiple_choice', 'true_false', 'identification', 'enumeration']);
        
        // Test with specific question types
        const quiz = await deepSeekService.generateQuizFromText(sampleText, {
            numQuestions: 6,
            difficulty: 'medium',
            questionTypes: ['multiple_choice', 'true_false', 'identification', 'enumeration']
        });

        console.log('\nGenerated Quiz:');
        console.log('Title:', quiz.title);
        console.log('Description:', quiz.description);
        console.log(`Total Questions: ${quiz.questions.length}`);
        
        // Count question types
        const typeCount = {};
        quiz.questions.forEach(q => {
            typeCount[q.type] = (typeCount[q.type] || 0) + 1;
        });
        console.log('Question type distribution:', typeCount);
        
        console.log('\nQuestions:');
        
        quiz.questions.forEach((q, index) => {
            console.log(`\n${index + 1}. [${q.type.toUpperCase()}] ${q.question}`);
            
            if (q.choices) {
                console.log('   Choices:', q.choices);
            }
            
            console.log('   Answer:', q.answer);
            console.log('   Explanation:', q.explanation);
            console.log('   Difficulty:', q.difficulty);
            console.log('   Topic:', q.topic);
        });

    } catch (error) {
        console.error('Error testing question types:', error.message);
        console.error('Full error:', error);
    }
}

// Run the test
testQuestionTypes();
