const mongoose = require('mongoose');

const LearningAnswerRecordSchema = new mongoose.Schema(
  {
    uid: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    quizId: {
      type: String,
      required: true,
      index: true
    },
    sectionId: {
      type: String,
      default: ''
    },
    questionId: {
      type: String,
      required: true,
      index: true
    },
    questionType: {
      type: Number,
      required: true
    },
    userAnswer: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: null
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

LearningAnswerRecordSchema.index({ uid: 1, quizId: 1, questionId: 1 }, { unique: true });

const LearningAnswerRecordModel = mongoose.model('learning_answer_record', LearningAnswerRecordSchema);

module.exports = LearningAnswerRecordModel;
