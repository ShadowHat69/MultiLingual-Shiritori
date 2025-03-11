const JISHO_API_URL = 'https://jisho.org/api/v1/search/words?keyword=';
const DICTIONARY_API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';


const startingWords = [
    // Animals
    "dog", "goat", "tiger", "rabbit", "elephant", 
  
    // Food
    "apple", "eggplant", "taco", "orange", "sushi",
  
    // Nature
    "tree", "earth", "hill", "leaf", "flower",
  
    // Objects
    "book", "key", "yarn", "notebook", "pen",
  
    // Places
    "city", "yokohama", "airport", "train", "nagasaki",
  
    // Technology
    "laptop", "phone", "network", "keyboard", "disk",
  
    // Colors
    "red", "dust", "silver", "rose", "emerald"
  ];

const state = {
    currentPlayer: 1,
    player1Score: 0,
    player2Score: 0,
    failcounter: 0,
    wordChain: [],
    usedWords: new Set(),
    lastLetterEnglish: '',
    lastLetterJapanese: '',
    isProcessing: false,
    gamestart: true
};

document.addEventListener('DOMContentLoaded', async function () {
    const elements = {
        player1: document.getElementById('player1'),
        player2: document.getElementById('player2'),
        score1: document.getElementById('score1'),
        score2: document.getElementById('score2'),
        wordChain: document.getElementById('wordChain'),
        wordInput: document.getElementById('wordInput'),
        submitButton: document.getElementById('submitWord'),
        feedback: document.getElementById('feedback'),
        usedWords: document.getElementById('usedWords'),
        loader: document.getElementById('loader')
    };

    async function initGame() {
        const startWord = startingWords[Math.floor(Math.random() * startingWords.length)];
        state.wordChain.push(startWord);
        state.usedWords.add(startWord);
        state.lastLetterEnglish = startWord.charAt(startWord.length - 1);
        state.lastLetterJapanese = await getHiraganaLastLetter(startWord);
        updateWordChain();
        updateGameInfo();
        elements.wordInput.focus();
    }

    elements.submitButton.addEventListener('click', submitWord);
    elements.wordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitWord(); });

    async function submitWord() {
        if (state.isProcessing) return;
    
        let word = elements.wordInput.value.trim().toLowerCase();
        const validation = await validateWord(word);
        if (!validation.valid) {
            elements.feedback.innerHTML = `<p class='invalid'>${validation.message}</p>`;
            return;
        }
    
        state.isProcessing = true;
        elements.loader.style.display = 'inline-block';
    
        try {
            state.wordChain.push(word);
            state.usedWords.add(word);
    
            // Check if the word is Japanese or English
            const isEnglish = /^[a-zA-Z]+$/.test(word);
            
            if (isEnglish) {
                // For English words
                state.lastLetterEnglish = word.charAt(word.length - 1);
                state.lastLetterJapanese = await getHiraganaLastLetter(word);
            } else {
                // For Japanese words
                state.lastLetterJapanese = word.charAt(word.length - 1);
                // Get romanized version of the last character
                const lastChar = word.charAt(word.length - 1);
                state.lastLetterEnglish = romanizeHiragana(lastChar).slice(-1);
            }
    
            state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
            state[`player${state.currentPlayer === 1 ? 2 : 1}Score`]++;
            elements.wordInput.value = '';
            elements.feedback.innerHTML = '';
            updateWordChain();
            updateGameInfo();
        } catch (error) {
            console.error('Error:', error);
            elements.feedback.innerHTML = `<p class='invalid'>API error. Try again.</p>`;
        } finally {
            state.isProcessing = false;
            elements.loader.style.display = 'none';
            elements.wordInput.focus();
        }
    }

    async function validateWord(word) {
        if (word.length < 2) return { valid: false, message: 'Word must be at least 2 letters.' };
    
        const firstChar = word.charAt(0);
        const firstHiragana = await getHiraganaFirstLetter(word);
    
        if (firstChar !== state.lastLetterEnglish && firstHiragana !== state.lastLetterJapanese) {
            return { valid: false, message: `Must start with "${state.lastLetterEnglish}" or "${state.lastLetterJapanese}".` };
        }
    
        if (state.usedWords.has(word)) return { valid: false, message: 'Word already used.' };
    
        const wordExists = await isValidWord(word);
        if (!wordExists) {
            state.failcounter++;
    
            if (state.failcounter >= 3) {
                console.log("Failed 3 times. Changing players...");
                state.failcounter = 0;
    
                // Switch players but DO NOT award points
                state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
    
                elements.wordInput.value = '';
                elements.feedback.innerHTML = `<p class='invalid'>Failed 3 times. Turn passed to Player ${state.currentPlayer}.</p>`;
                updateWordChain();
                updateGameInfo();
                
                return { valid: false, message: 'Failed 3 Times. Changing player...' };
            }
    
            return { valid: false, message: 'Not a valid word in our dictionary.' };
        }
    
        // If word is valid, reset fail counter
        state.failcounter = 0;
        return { valid: true };
    }

    async function getHiraganaLastLetter(word) {
        // For English words, map the last letter to appropriate hiragana
        if (/^[a-zA-Z]+$/.test(word)) {
            const lastEnglishChar = word.charAt(word.length - 1).toLowerCase();
            const englishToHiragana = {
                'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
                'k': 'か', 's': 'さ', 't': 'た', 'n': 'な',
                'h': 'は', 'm': 'ま', 'y': 'や', 'r': 'ら',
                'w': 'わ', 'g': 'が', 'z': 'ざ', 'd': 'だ',
                'b': 'ば', 'p': 'ぱ', 'j': 'じゃ',
                'c': 'か', 'f': 'ふ', 'l': 'ら', 'q': 'く',
                'v': 'ば', 'x': 'くさ'
            };
            
            return englishToHiragana[lastEnglishChar] || lastEnglishChar;
        }
        
        // For Japanese words, just return the last character
        return word.charAt(word.length - 1);
    }

    async function getHiraganaFirstLetter(word) {
        // For English words, map the first letter to appropriate hiragana
        if (/^[a-zA-Z]+$/.test(word)) {
            const firstEnglishChar = word.charAt(0).toLowerCase();
            const englishToHiragana = {
                'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
                'k': 'か', 's': 'さ', 't': 'た', 'n': 'な',
                'h': 'は', 'm': 'ま', 'y': 'や', 'r': 'ら',
                'w': 'わ', 'g': 'が', 'z': 'ざ', 'd': 'だ',
                'b': 'ば', 'p': 'ぱ', 'j': 'じゃ',
                'c': 'か', 'f': 'ふ', 'l': 'ら', 'q': 'く',
                'v': 'ば', 'x': 'くさ'
            };
            
            return englishToHiragana[firstEnglishChar] || firstEnglishChar;
        }
        
        // For Japanese words, just return the first character
        return word.charAt(0);
    }

    function updateWordChain() {
        elements.wordChain.innerHTML = state.wordChain
            .map((word, i) => {
                if (i === 0) {
                    return `<p><strong>Starting word:</strong> ${word}</p>`; // Keep the first word format
                } else {
                    return `<p>Player ${i % 2 === 1 ? 1 : 2}: ${word}</p>`; // Alternating player display
                }
            })
            .join('');
        
        elements.wordChain.scrollTop = elements.wordChain.scrollHeight;
        elements.usedWords.textContent = Array.from(state.usedWords)
            .slice(-5)
            .join(', ') + (state.usedWords.size > 5 ? '...' : '');
    }

    function updateGameInfo() {
        elements.score1.textContent = state.player1Score;
        elements.score2.textContent = state.player2Score;
        elements.player1.className = state.currentPlayer === 1 ? 'player active' : 'player inactive';
        elements.player2.className = state.currentPlayer === 2 ? 'player active' : 'player inactive';
        elements.wordInput.placeholder = `Player ${state.currentPlayer}, enter a word starting with "${state.lastLetterEnglish}" or "${state.lastLetterJapanese}"...`;
    }

    // Add this function to your script
function romanizeHiragana(hiragana) {
    const hiraganaToRomaji = {
        'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
        'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
        'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
        'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
        'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
        'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
        'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
        'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
        'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
        'わ': 'wa', 'を': 'o', 'ん': 'n',
        'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
        'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
        'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
        'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
        'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
        'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
        'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
        'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
        'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
        'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
        'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
        'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
        'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
        'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
        'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
        'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
        'っ': '' // Small tsu - affects consonant doubling
    };

    // Handle small tsu (doubling consonant)
    let romaji = '';
    for (let i = 0; i < hiragana.length; i++) {
        const char = hiragana[i];
        
        if (char === 'っ' && i < hiragana.length - 1) {
            const nextChar = hiragana[i + 1];
            const nextRomaji = hiraganaToRomaji[nextChar];
            if (nextRomaji && nextRomaji.length > 0) {
                romaji += nextRomaji[0]; // Double the consonant
            }
            continue;
        }
        
        // Handle digraphs (two-character combinations)
        if (i < hiragana.length - 1) {
            const digraph = char + hiragana[i + 1];
            if (hiraganaToRomaji[digraph]) {
                romaji += hiraganaToRomaji[digraph];
                i++;  // Skip the next character
                continue;
            }
        }
        
        romaji += hiraganaToRomaji[char] || char;
    }
    
    return romaji;
}

async function isValidWord(word) {
    try {
        const japresponse = await fetch(`/proxy?url=${encodeURIComponent(JISHO_API_URL + word)}`);
        const engresponse = await fetch(`${DICTIONARY_API_URL}${word}`);

        
        const data = await japresponse.json();

        console.log("Word: " + word);
        console.log("Reading: " +data.data[0].japanese[0].reading); //Returns the reading of that slug
        console.log("Reading2: " +data.data[0].senses[0].english_definitions[0]); //Returns the reading of that slug

        // if (word !== data.data[0].japanese[0].reading)
        // {
        //     if (!toString(data.data[0].senses[0].english_definitions[0]).includes(toString(word))) 
        //     {
        //         return false
        //     }
        //     else 
        //     {
        //         return true;
        //     }
        // }
        // else {
        //     return true;
        // }
        if (word !== data.data[0].japanese[0].reading)
            {
                //if (word !== toString(data.data[0].senses[0].english_definitions[0])) 
                if (!engresponse.ok) 
                {
                    return false
                }
                else 
                {
                    return true;
                }
            }
            else {
                return true;
            }

        
    } catch (error) {
        console.error("Error validating word:", error);
        return false;
    }
}

   await initGame();
});
