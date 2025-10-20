/**
 * AnswerParserService - Parses voice input into quiz answers
 * Handles different question types and various speech patterns
 */

class AnswerParserService {
  constructor() {
    // Common patterns for multiple choice answers
    this.choicePatterns = {
      // Direct letters
      'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E',
      // Spelled out letters
      'alpha': 'A', 'beta': 'B', 'charlie': 'C', 'delta': 'D', 'echo': 'E',
      // NATO phonetic alphabet
      'alfa': 'A', 'bravo': 'B', 'charlie': 'C', 'delta': 'D', 'echo': 'E',
      // Numbers (for numbered choices)
      'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
      '1': '1', '2': '2', '3': '3', '4': '4', '5': '5',
      // Common phrases
      'option a': 'A', 'option b': 'B', 'option c': 'C', 'option d': 'D',
      'choice a': 'A', 'choice b': 'B', 'choice c': 'C', 'choice d': 'D',
      'the first': 'A', 'the second': 'B', 'the third': 'C', 'the fourth': 'D',
      'first': 'A', 'second': 'B', 'third': 'C', 'fourth': 'D',
      // Additional patterns for better recognition
      'letter a': 'A', 'letter b': 'B', 'letter c': 'C', 'letter d': 'D',
      'answer a': 'A', 'answer b': 'B', 'answer c': 'C', 'answer d': 'D',
      'select a': 'A', 'select b': 'B', 'select c': 'C', 'select d': 'D',
      'go with a': 'A', 'go with b': 'B', 'go with c': 'C', 'go with d': 'D',
      'pick a': 'A', 'pick b': 'B', 'pick c': 'C', 'pick d': 'D',
      // More speech variations
      'ay': 'A', 'bee': 'B', 'see': 'C', 'dee': 'D', 'ee': 'E',
      'eh': 'A', 'be': 'B', 'sea': 'C', 'the': 'D',
      'uh': 'A', 'bee': 'B', 'see': 'C', 'dee': 'D',
      // Common speech recognition errors
      'hey': 'A', 'be': 'B', 'see': 'C', 'the': 'D',
      'ay': 'A', 'bee': 'B', 'see': 'C', 'dee': 'D'
    }

    // True/False patterns
    this.booleanPatterns = {
      'true': true, 'false': false,
      'yes': true, 'no': false,
      'correct': true, 'incorrect': false,
      'right': true, 'wrong': false,
      't': true, 'f': false,
      'y': true, 'n': false,
      // Additional patterns
      'affirmative': true, 'negative': false,
      'positive': true, 'negative': false,
      'agree': true, 'disagree': false,
      'sure': true, 'not sure': false,
      'definitely': true, 'definitely not': false,
      'absolutely': true, 'absolutely not': false
    }
  }

  /**
   * Parse voice input for multiple choice questions
   * @param {string} transcript - Speech transcript
   * @param {Array} choices - Available choices
   * @returns {string|null} - Parsed answer or null if not found
   */
  parseMultipleChoice(transcript, choices) {
    const normalized = transcript.toLowerCase().trim()
    
    // Remove common prefixes and suffixes
    const cleaned = normalized
      .replace(/^(my answer is|i choose|i select|the answer is|answer|i think|i believe|i would say|i would choose|i pick|i go with)\s*/i, '')
      .replace(/\s*(please|thanks|thank you|that's it|that's my answer|that's correct|that's right)$/i, '')
      .trim()

    console.log('Parsing multiple choice:', { transcript, cleaned, choices })

    // 1. Direct match with choices (exact or partial)
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i].toLowerCase()
      if (cleaned === choice || cleaned.includes(choice) || choice.includes(cleaned)) {
        console.log('Direct match found:', choices[i])
        return choices[i]
      }
    }

    // 2. Look for single letters A, B, C, D, E anywhere in the text
    const letterMatches = cleaned.match(/[a-e]/g)
    if (letterMatches) {
      for (const letter of letterMatches) {
        const index = letter.charCodeAt(0) - 97 // a=0, b=1, etc.
        if (index < choices.length) {
          console.log('Letter found in transcript:', letter, choices[index])
          return choices[index]
        }
      }
    }

    // 3. Look for numbers 1, 2, 3, 4, 5 anywhere in the text
    const numberMatches = cleaned.match(/[1-5]/g)
    if (numberMatches) {
      for (const num of numberMatches) {
        const index = parseInt(num) - 1
        if (index < choices.length) {
          console.log('Number found in transcript:', num, choices[index])
          return choices[index]
        }
      }
    }

    // 4. Pattern matching with expanded patterns
    for (const [pattern, result] of Object.entries(this.choicePatterns)) {
      if (cleaned.includes(pattern) || this.fuzzyMatch(cleaned, pattern)) {
        if (result.match(/^[A-E]$/)) {
          const index = result.charCodeAt(0) - 65
          if (index < choices.length) {
            console.log('Letter pattern match:', result, choices[index])
            return choices[index]
          }
        } else if (result.match(/^[1-5]$/)) {
          const index = parseInt(result) - 1
          if (index < choices.length) {
            console.log('Number pattern match:', result, choices[index])
            return choices[index]
          }
        }
      }
    }

    // 5. Try to match with first word or character
    const firstWord = cleaned.split(' ')[0]
    if (firstWord.match(/^[a-e]$/)) {
      const index = firstWord.charCodeAt(0) - 97
      if (index < choices.length) {
        console.log('First word letter match:', firstWord, choices[index])
        return choices[index]
      }
    }
    if (firstWord.match(/^[1-5]$/)) {
      const index = parseInt(firstWord) - 1
      if (index < choices.length) {
        console.log('First word number match:', firstWord, choices[index])
        return choices[index]
      }
    }

    // 6. Try to find ordinal words (first, second, third, fourth)
    const ordinalPatterns = {
      'first': 0, 'second': 1, 'third': 2, 'fourth': 3, 'fifth': 4,
      '1st': 0, '2nd': 1, '3rd': 2, '4th': 3, '5th': 4
    }
    
    for (const [ordinal, index] of Object.entries(ordinalPatterns)) {
      if (cleaned.includes(ordinal) && index < choices.length) {
        console.log('Ordinal match:', ordinal, choices[index])
        return choices[index]
      }
    }

    // 7. Try to match with choice content (if choices contain keywords)
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i].toLowerCase()
      const choiceWords = choice.split(' ')
      
      // Check if any significant words from the choice appear in the transcript
      for (const word of choiceWords) {
        if (word.length > 3 && cleaned.includes(word)) { // Only match words longer than 3 chars
          console.log('Choice content match:', word, choices[i])
          return choices[i]
        }
      }
    }

    console.log('No match found for:', cleaned)
    return null
  }

  /**
   * Enhanced fuzzy matching for speech recognition variations
   * @param {string} text - Input text
   * @param {string} pattern - Pattern to match
   * @returns {boolean} - Whether there's a fuzzy match
   */
  fuzzyMatch(text, pattern) {
    // Check if pattern is contained in text or vice versa
    if (text.includes(pattern) || pattern.includes(text)) {
      return true
    }
    
    // Check for common speech recognition errors
    const cleanText = text.replace(/[^a-z]/g, '')
    const cleanPattern = pattern.replace(/[^a-z]/g, '')
    
    if (cleanText.includes(cleanPattern) || cleanPattern.includes(cleanText)) {
      return true
    }
    
    // Check for common letter substitutions
    const substitutions = {
      'a': ['ay', 'eh', 'uh'],
      'b': ['be', 'bee'],
      'c': ['see', 'sea'],
      'd': ['dee', 'the'],
      'e': ['ee', 'eh']
    }
    
    for (const [letter, variants] of Object.entries(substitutions)) {
      for (const variant of variants) {
        if (text.includes(variant) && pattern.includes(letter)) {
          return true
        }
        if (text.includes(letter) && pattern.includes(variant)) {
          return true
        }
      }
    }
    
    return false
  }

  /**
   * Parse voice input for true/false questions
   * @param {string} transcript - Speech transcript
   * @returns {boolean|null} - Parsed answer or null if not found
   */
  parseTrueFalse(transcript) {
    const normalized = transcript.toLowerCase().trim()
    
    // Remove common prefixes
    const cleaned = normalized
      .replace(/^(my answer is|i think|i believe|the answer is|answer)\s*/i, '')
      .replace(/\s*(please|thanks|thank you)$/i, '')
      .trim()

    for (const [pattern, result] of Object.entries(this.booleanPatterns)) {
      if (cleaned.includes(pattern)) {
        return result
      }
    }

    return null
  }

  /**
   * Parse voice input for identification questions
   * @param {string} transcript - Speech transcript
   * @returns {string|null} - Parsed answer or null if empty
   */
  parseIdentification(transcript) {
    const cleaned = transcript.trim()
    
    // Remove common prefixes
    const answer = cleaned
      .replace(/^(my answer is|the answer is|answer|i think|i believe)\s*/i, '')
      .replace(/\s*(please|thanks|thank you)$/i, '')
      .trim()

    return answer.length > 0 ? answer : null
  }

  /**
   * Parse voice input for enumeration questions
   * @param {string} transcript - Speech transcript
   * @returns {Array|null} - Parsed answers array or null if empty
   */
  parseEnumeration(transcript) {
    const cleaned = transcript.trim()
    
    // Remove common prefixes
    const answer = cleaned
      .replace(/^(my answers are|the answers are|answers|i think|i believe)\s*/i, '')
      .replace(/\s*(please|thanks|thank you)$/i, '')
      .trim()

    if (!answer) return null

    // Split by common separators
    const separators = [',', ' and ', ' also ', ' plus ', ' then ', ' next ']
    let items = [answer]

    for (const separator of separators) {
      const newItems = []
      for (const item of items) {
        newItems.push(...item.split(separator))
      }
      items = newItems
    }

    // Clean up items
    const cleanedItems = items
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .map(item => {
        // Remove ordinal numbers
        return item.replace(/^(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s*/i, '')
      })

    return cleanedItems.length > 0 ? cleanedItems : null
  }

  /**
   * Parse voice input based on question type
   * @param {string} transcript - Speech transcript
   * @param {Object} question - Question object with type and choices
   * @returns {*} - Parsed answer based on question type
   */
  parseAnswer(transcript, question) {
    console.log('Parsing answer for question type:', question.type, 'transcript:', transcript)
    
    let result = null
    switch (question.type) {
      case 'multiple_choice':
        result = this.parseMultipleChoice(transcript, question.choices || [])
        console.log('Multiple choice result:', result)
        break
      
      case 'true_false':
        result = this.parseTrueFalse(transcript)
        console.log('True/false result:', result)
        break
      
      case 'identification':
        result = this.parseIdentification(transcript)
        console.log('Identification result:', result)
        break
      
      case 'enumeration':
        result = this.parseEnumeration(transcript)
        console.log('Enumeration result:', result)
        break
      
      default:
        console.log('Unknown question type:', question.type)
        result = null
    }
    
    return result
  }

  /**
   * Generate speech text for question and choices
   * @param {Object} question - Question object
   * @param {number} questionNumber - Question number
   * @returns {string} - Formatted speech text
   */
  generateQuestionSpeech(question, questionNumber) {
    let speechText = `Question ${questionNumber}: ${question.question}`
    
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      speechText += ' Your choices are: '
      question.choices.forEach((choice, index) => {
        const letter = String.fromCharCode(65 + index) // A, B, C, D
        speechText += `${letter}: ${choice}. `
      })
    } else if (question.type === 'identification') {
      speechText += ' Please provide your answer.'
    } else if (question.type === 'enumeration') {
      speechText += ' Please list your answers, separating them with commas.'
    }
    
    return speechText
  }

  /**
   * Generate confirmation speech for answer
   * @param {*} answer - Parsed answer
   * @param {Object} question - Question object
   * @returns {string} - Confirmation speech text
   */
  generateConfirmationSpeech(answer, question) {
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      return `Recorded ${answer}. Moving to next question.`
    } else if (question.type === 'identification') {
      return `Recorded: ${answer}. Moving to next question.`
    } else if (question.type === 'enumeration') {
      return `Recorded ${answer.length} items. Moving to next question.`
    }
    return 'Answer recorded. Moving to next question.'
  }
}

// Export singleton instance
export default new AnswerParserService()
