import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './components/ui/button';
import AuthScreen from './components/AuthScreen';
import { fetchMe, saveScore, signOut, type ScoreSummary, type User } from './api';
import closedChest from './assets/treasure_closed.png';
import treasureChest from './assets/treasure_opened.png';
import skeletonChest from './assets/treasure_opened_skeleton.png';
import keyCursor from './assets/key.png';
import chestOpenSound from './audios/chest_open.mp3';
import evilLaughSound from './audios/chest_open_with_evil_laugh.mp3';

interface Box {
  id: number;
  isOpen: boolean;
  hasTreasure: boolean;
}

export default function App() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [user, setUser] = useState<User | null>(null); // null = playing as guest
  const [scores, setScores] = useState<ScoreSummary | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const initializeGame = () => {
    // Randomly assign treasure to one box
    const treasureBoxIndex = Math.floor(Math.random() * 3);
    const newBoxes: Box[] = Array.from({ length: 3 }, (_, index) => ({
      id: index,
      isOpen: false,
      hasTreasure: index === treasureBoxIndex,
    }));
    
    setBoxes(newBoxes);
    setScore(0);
    setGameEnded(false);
  };

  // Initialize game automatically when component mounts
  useEffect(() => {
    initializeGame();
  }, []);

  // Restore a signed-in session from the stored token on first load (otherwise stay a guest)
  useEffect(() => {
    fetchMe().then(me => {
      if (!me) return;
      setUser(me.user);
      setScores(me.scores);
    });
  }, []);

  // Save the final score when a signed-in player's game ends (guests are never saved)
  useEffect(() => {
    if (!gameEnded || !user) return;
    saveScore(score).then(setScores).catch(err => console.error('Failed to save score:', err));
  }, [gameEnded]);

  // Close the sign-in screen and start a fresh game for the newly signed-in user
  const handleSignedIn = (signedInUser: User) => {
    setUser(signedInUser);
    setShowAuth(false);
    fetchMe().then(me => setScores(me?.scores ?? null));
    initializeGame();
  };

  // Sign out and keep playing as a guest
  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setScores(null);
  };

  // Play the normal chest-open sound for treasure, or the evil-laugh version for a skeleton
  const playOpenSound = (hasTreasure: boolean) => {
    new Audio(hasTreasure ? chestOpenSound : evilLaughSound).play().catch(() => {});
  };

  const openBox = (boxId: number) => {
    if (gameEnded) return;

    const targetBox = boxes.find(box => box.id === boxId);
    if (targetBox && !targetBox.isOpen) {
      playOpenSound(targetBox.hasTreasure);
    }

    setBoxes(prevBoxes => {
      const updatedBoxes = prevBoxes.map(box => {
        if (box.id === boxId && !box.isOpen) {
          const newScore = box.hasTreasure ? score + 100 : score - 50;
          setScore(newScore);
          return { ...box, isOpen: true };
        }
        return box;
      });
      
      // Check if treasure is found or all boxes are opened
      const treasureFound = updatedBoxes.some(box => box.isOpen && box.hasTreasure);
      const allOpened = updatedBoxes.every(box => box.isOpen);
      if (treasureFound || allOpened) {
        setGameEnded(true);
      }
      
      return updatedBoxes;
    });
  };

  const resetGame = () => {
    initializeGame();
  };

  if (showAuth) {
    return <AuthScreen onSignedIn={handleSignedIn} onCancel={() => setShowAuth(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-amber-100 flex flex-col items-center justify-center p-8">
      <div className="flex items-center gap-3 text-amber-800 text-sm" style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        {user ? (
          <>
            <span>Signed in as {user.username}</span>
            <button type="button" className="underline cursor-pointer" onClick={handleSignOut}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <span>Playing as Guest (scores not saved)</span>
            <Button onClick={() => setShowAuth(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
              Sign in
            </Button>
          </>
        )}
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl mb-4 text-amber-900">🏴‍☠️ Treasure Hunt Game 🏴‍☠️</h1>
        <p className="text-amber-800 mb-4">
          Click on the treasure chests to discover what's inside!
        </p>
        <p className="text-amber-700 text-sm">
          💰 Treasure: +$100 | 💀 Skeleton: -$50
        </p>
      </div>

      <div className="mb-8">
        <div className="text-2xl text-center p-4 bg-amber-200/80 backdrop-blur-sm rounded-lg shadow-lg border-2 border-amber-400">
          <span className="text-amber-900">Current Score: </span>
          <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${score}
          </span>
        </div>
        {scores && (
          <p className="text-amber-700 text-sm text-center mt-2">
            Best: {scores.best === null ? '—' : `$${scores.best}`} · Games played: {scores.games}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {boxes.map((box) => (
              <motion.div
                key={box.id}
                className="flex flex-col items-center"
                style={{ cursor: box.isOpen || gameEnded ? 'default' : `url(${keyCursor}), pointer` }}
                whileHover={{ scale: box.isOpen ? 1 : 1.05 }}
                whileTap={{ scale: box.isOpen ? 1 : 0.95 }}
                onClick={() => openBox(box.id)}
              >
                <motion.div
                  initial={{ rotateY: 0 }}
                  animate={{ 
                    rotateY: box.isOpen ? 180 : 0,
                    scale: box.isOpen ? 1.1 : 1
                  }}
                  transition={{ 
                    duration: 0.6,
                    ease: "easeInOut"
                  }}
                  className="relative"
                >
                  <img
                    src={box.isOpen 
                      ? (box.hasTreasure ? treasureChest : skeletonChest)
                      : closedChest
                    }
                    alt={box.isOpen 
                      ? (box.hasTreasure ? "Treasure!" : "Skeleton!")
                      : "Treasure Chest"
                    }
                    className="w-48 h-48 object-contain drop-shadow-lg"
                  />
                  
                  {box.isOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="absolute -top-8 left-1/2 transform -translate-x-1/2"
                    >
                      {box.hasTreasure ? (
                        <div className="text-2xl animate-bounce">✨💰✨</div>
                      ) : (
                        <div className="text-2xl animate-pulse">💀👻💀</div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
                
                <div className="mt-4 text-center">
                  {box.isOpen ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, duration: 0.3 }}
                      className={`text-lg p-2 rounded-lg ${
                        box.hasTreasure 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {box.hasTreasure ? '+$100' : '-$50'}
                    </motion.div>
                  ) : (
                    <div className="text-amber-700 p-2">
                      Click to open!
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
      </div>

      {gameEnded && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mb-4 p-6 bg-amber-200/80 backdrop-blur-sm rounded-xl shadow-lg border-2 border-amber-400">
                <h2 className="text-2xl mb-2 text-amber-900">Game Over!</h2>
                <p className="text-lg text-amber-800">
                  Final Score: <span className={`${score >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${score}
                  </span>
                </p>
                <p className="text-sm text-amber-600 mt-2">
                  {boxes.some(box => box.isOpen && box.hasTreasure) 
                    ? 'Treasure found! Well done, treasure hunter! 🎉' 
                    : 'No treasure found this time! Better luck next time! 💀'}
                </p>
              </div>
              
              <Button 
                onClick={resetGame}
                className="text-lg px-8 py-4 bg-amber-600 hover:bg-amber-700 text-white"
              >
                Play Again
              </Button>
            </motion.div>
          )}
    </div>
  );
}
