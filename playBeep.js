   function playBeep() {
	   
			if (soundOff) return;
	   
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                const context = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                oscillator.type = 'sine';
                
                oscillator.frequency.setValueAtTime(pitch, context.currentTime);
                
                const duration = 0.6; 
                const fadeOutTime = 0.3; 

                oscillator.start();
                
                gainNode.gain.setValueAtTime(1, context.currentTime);
                
                gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration - fadeOutTime);
                
                oscillator.stop(context.currentTime + duration);
            } else {
                console.error('Web Audio API is not supported in this browser.');
            }
        }