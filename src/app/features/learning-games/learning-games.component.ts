import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

interface Game {
  id: string;
  title: string;
  description: string;
  category: 'math' | 'language' | 'science' | 'art' | 'music';
  ageGroup: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  icon: string;
  color: string;
}

interface GameProgress {
  gameId: string;
  childId: string;
  score: number;
  completedAt: Date;
  timeSpent: number;
}

@Component({
  selector: 'app-learning-games',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './learning-games.component.html',
  styleUrls: ['./learning-games.component.scss']
})
export class LearningGamesComponent implements OnInit {
  
  games: Game[] = [
    {
      id: '1',
      title: 'Number Adventure',
      description: 'Learn counting and basic math through fun adventures',
      category: 'math',
      ageGroup: '3-5 years',
      difficulty: 'easy',
      duration: 15,
      icon: 'bi-calculator',
      color: '#4CAF50'
    },
    {
      id: '2',
      title: 'Letter Safari',
      description: 'Explore the alphabet with animal friends',
      category: 'language',
      ageGroup: '4-6 years',
      difficulty: 'easy',
      duration: 20,
      icon: 'bi-alphabet',
      color: '#2196F3'
    },
    {
      id: '3',
      title: 'Color Mixer Lab',
      description: 'Discover how colors mix and create new ones',
      category: 'science',
      ageGroup: '3-7 years',
      difficulty: 'medium',
      duration: 25,
      icon: 'bi-palette',
      color: '#FF9800'
    },
    {
      id: '4',
      title: 'Shape Builder',
      description: 'Build structures using different geometric shapes',
      category: 'math',
      ageGroup: '4-6 years',
      difficulty: 'medium',
      duration: 30,
      icon: 'bi-shapes',
      color: '#9C27B0'
    },
    {
      id: '5',
      title: 'Music Maker',
      description: 'Create melodies and learn about rhythm',
      category: 'music',
      ageGroup: '3-8 years',
      difficulty: 'easy',
      duration: 20,
      icon: 'bi-music-note',
      color: '#E91E63'
    },
    {
      id: '6',
      title: 'Story Creator',
      description: 'Build your own stories with characters and scenes',
      category: 'language',
      ageGroup: '5-8 years',
      difficulty: 'hard',
      duration: 35,
      icon: 'bi-book',
      color: '#795548'
    }
  ];

  selectedCategory: string = 'all';
  selectedDifficulty: string = 'all';
  searchTerm: string = '';

  // Game state
  currentGame: any = null;
  mathQuestion: any = null;
  userAnswer: number | null = null;
  score: number = 0;
  gameStarted: boolean = false;
  
  // Letter Safari game state
  currentLetter: string = '';
  letterOptions: string[] = [];
  selectedLetter: string = '';
  
  // Color Mixer game state
  color1: string = '';
  color2: string = '';
  mixedColor: string = '';
  colorOptions: string[] = ['red', 'blue', 'yellow', 'green', 'orange', 'purple'];
  
  // Shape Builder game state
  availableShapes: string[] = ['circle', 'square', 'triangle', 'rectangle'];
  selectedShapes: string[] = [];
  
  // Music Maker game state
  notes: string[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  melody: string[] = [];

  ngOnInit(): void {
    // Initialize component
  }

  get filteredGames(): Game[] {
    return this.games.filter(game => {
      const matchesCategory = this.selectedCategory === 'all' || game.category === this.selectedCategory;
      const matchesDifficulty = this.selectedDifficulty === 'all' || game.difficulty === this.selectedDifficulty;
      const matchesSearch = game.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           game.description.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return matchesCategory && matchesDifficulty && matchesSearch;
    });
  }

  startGame(game: Game): void {
    this.currentGame = game;
    this.gameStarted = true;
    this.score = 0;
    
    switch(game.id) {
      case '1': // Number Adventure
        this.startMathGame();
        break;
      case '2': // Letter Safari
        this.startLetterGame();
        break;
      case '3': // Color Mixer Lab
        this.startColorGame();
        break;
      case '4': // Shape Builder
        this.startShapeGame();
        break;
      case '5': // Music Maker
        this.startMusicGame();
        break;
      case '6': // Story Creator
        this.startStoryGame();
        break;
      default:
        Swal.fire({
          icon: 'info',
          title: 'Game Starting',
          text: `Starting ${game.title}!`,
          timer: 1500,
          showConfirmButton: false
        });
    }
  }

  startMathGame(): void {
    this.generateMathQuestion();
  }
  
  startLetterGame(): void {
    this.generateLetterQuestion();
  }
  
  startColorGame(): void {
    this.generateColorMix();
  }
  
  startShapeGame(): void {
    this.selectedShapes = [];
  }
  
  startMusicGame(): void {
    this.melody = [];
  }
  
  startStoryGame(): void {
    // Story game logic
  }

  generateMathQuestion(): void {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-'];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    let answer: number;
    let question: string;
    
    if (operation === '+') {
      answer = num1 + num2;
      question = `${num1} + ${num2} = ?`;
    } else {
      // Ensure positive result for subtraction
      const larger = Math.max(num1, num2);
      const smaller = Math.min(num1, num2);
      answer = larger - smaller;
      question = `${larger} - ${smaller} = ?`;
    }
    
    this.mathQuestion = { question, answer };
    this.userAnswer = null;
  }

  submitAnswer(): void {
    if (this.userAnswer === this.mathQuestion.answer) {
      this.score += 10;
      Swal.fire({
        icon: 'success',
        title: 'Correct! 🎉',
        text: 'Well done!',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Not quite! 💪',
        text: `The answer is ${this.mathQuestion.answer}. Try the next one!`,
        timer: 2000,
        showConfirmButton: false
      });
    }

    this.generateMathQuestion();
  }

  endGame(): void {
    this.gameStarted = false;
    this.currentGame = null;
    Swal.fire({
      icon: 'success',
      title: 'Game Finished! 🏆',
      text: `Your final score: ${this.score} points!`,
      confirmButtonColor: '#7dd3c0'
    });
  }
  
  generateLetterQuestion(): void {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.currentLetter = letters[Math.floor(Math.random() * letters.length)];
    
    // Generate 4 options including the correct one
    this.letterOptions = [this.currentLetter];
    while (this.letterOptions.length < 4) {
      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      if (!this.letterOptions.includes(randomLetter)) {
        this.letterOptions.push(randomLetter);
      }
    }
    this.letterOptions = this.shuffleArray(this.letterOptions);
    this.selectedLetter = '';
  }
  
  selectLetter(letter: string): void {
    this.selectedLetter = letter;
    if (letter === this.currentLetter) {
      this.score += 10;
      Swal.fire({
        icon: 'success',
        title: 'Correct! 🎉',
        text: 'Great job!',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Not quite! 💪',
        text: `The correct letter is ${this.currentLetter}. Try again!`,
        timer: 2000,
        showConfirmButton: false
      });
    }
    setTimeout(() => this.generateLetterQuestion(), 1000);
  }
  
  generateColorMix(): void {
    this.color1 = this.colorOptions[Math.floor(Math.random() * 3)]; // red, blue, yellow
    this.color2 = this.colorOptions[Math.floor(Math.random() * 3)];
    
    // Simple color mixing logic
    if ((this.color1 === 'red' && this.color2 === 'blue') || (this.color1 === 'blue' && this.color2 === 'red')) {
      this.mixedColor = 'purple';
    } else if ((this.color1 === 'red' && this.color2 === 'yellow') || (this.color1 === 'yellow' && this.color2 === 'red')) {
      this.mixedColor = 'orange';
    } else if ((this.color1 === 'blue' && this.color2 === 'yellow') || (this.color1 === 'yellow' && this.color2 === 'blue')) {
      this.mixedColor = 'green';
    } else {
      this.mixedColor = this.color1;
    }
  }
  
  mixColors(): void {
    this.score += 15;
    Swal.fire({
      icon: 'success',
      title: 'Great! 🎨',
      text: `${this.color1} + ${this.color2} = ${this.mixedColor}!`,
      timer: 2000,
      showConfirmButton: false
    });
    setTimeout(() => this.generateColorMix(), 1000);
  }
  
  addShape(shape: string): void {
    this.selectedShapes.push(shape);
    this.score += 5;
  }
  
  removeShape(index: number): void {
    this.selectedShapes.splice(index, 1);
  }
  
  addNote(note: string): void {
    this.melody.push(note);
    this.score += 3;
  }
  
  playMelody(): void {
    Swal.fire({
      icon: 'info',
      title: 'Playing Melody 🎵',
      text: this.melody.join(' - '),
      timer: 2000,
      showConfirmButton: false
    });
    this.score += 20;
  }
  
  clearMelody(): void {
    this.melody = [];
  }
  
  private shuffleArray(array: any[]): any[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getDifficultyColor(difficulty: string): string {
    const colors = {
      easy: 'success',
      medium: 'warning',
      hard: 'danger'
    };
    return colors[difficulty as keyof typeof colors] || 'secondary';
  }

  getCategoryIcon(category: string): string {
    const icons = {
      math: 'bi-calculator',
      language: 'bi-chat-text',
      science: 'bi-flask',
      art: 'bi-palette',
      music: 'bi-music-note'
    };
    return icons[category as keyof typeof icons] || 'bi-controller';
  }
  
  getColorStyle(color: string): any {
    return {
      'background-color': color,
      'width': '60px',
      'height': '60px',
      'border-radius': '50%',
      'display': 'inline-block',
      'margin': '5px',
      'border': '2px solid #333'
    };
  }
}