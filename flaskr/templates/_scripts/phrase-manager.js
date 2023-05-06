function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const phraseManager = {

  init(target, phrase_list, play_callback, status_callback) {
    this.target          = target;
    this.phrase_list     = phrase_list;
    this.status_callback = status_callback;

    // Check if the widget is paused and if the current thread is still the main one
    this.play_callback = (thread_id) => {
      return play_callback() && thread_id === this.timeout;
    }

    // Shuffle the original list of phrases
    this.shuffle_phrases();

    // Track current phrase and current letter in that phrase
    // curr_letter = -1 means backspacing
    this.curr_phrase = 0;
    this.curr_letter = 0;
    this.timeout = null;

    // Bind handler to self
    this.handle = this.handle.bind(this);

    // Listen for a "play" event to resume
    target.addEventListener('play', ({detail}) => {
      this.handle(detail.play);
    });

    // Start playing
    this.handle(true);
  },

  // Shuffle the phrase list into a pseudo-random order
  shuffle_phrases() {
    this.phrase_list = this.phrase_list;
  },

  // Primary looping function
  async handle(val) {
    if (!val) return;

    // Start a new thread and mark it as the active one
    const timeout = setTimeout(async () => {
      this.timeout = timeout;

      // Play the typing animation
      // Returns early if widget is paused or main thread is changed
      await this.play(timeout);

      // If not paused and this is still the active thread, recurse
      if (this.play_callback(timeout)) {
        this.handle(true);
      }
    }, 50);
  },

  // Full loop for writing & deleting a descriptor
  // When called resumes based on value of curr_letter
  // As soon as play_callback is false, returns
  async play(thread_id) {

    // Play the typing animation
    if (!this.play_callback(thread_id)) return;
    if (this.curr_letter >= 0) {
      await this.write_phrase(thread_id);
    }

    // Play the backspacing animation
    if (!this.play_callback(thread_id)) return;
    if (this.curr_letter === -1) {
      await this.backspace_phrase(thread_id);
    }
    
    // Update letter & phrase indices
    if (!this.play_callback(thread_id)) return;
    this.curr_letter = 0;
    this.curr_phrase += 1;
    if (this.curr_phrase >= this.phrase_list.length) {
      this.curr_phrase = 0;
      this.shuffle_phrases();
    }
  },

  // Write out a phrase, from curr_letter to the end
  async write_phrase(thread_id) {
    const phrase = this.phrase_list[this.curr_phrase];
    this.status_callback(true);
    while (this.curr_letter < phrase.length) {
      const c = phrase.charAt(this.curr_letter++);
      this.target.innerHTML += c === '\n' ? '<br>' : c;
      await delay(50);
      if (!this.play_callback(thread_id)) {
        this.status_callback(false);
        return;
      }
    }
    this.status_callback(false);
    await delay(2000);
    if (!this.play_callback(thread_id)) return;
    this.curr_letter = -1;
  },

  // Delete the phrase one letter at a time from the end
  async backspace_phrase(thread_id) {
    this.status_callback(true);
    while (target.innerHTML.length > 0) {
      this.target.innerHTML = target.innerHTML.substring(0, target.innerHTML.length - 1);
      await delay(10);
      if (!this.play_callback(thread_id)) {
        this.status_callback(false);
        return;
      }
    }
    this.status_callback(false);
  },
}
