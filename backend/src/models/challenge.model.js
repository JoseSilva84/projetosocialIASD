import mongoose from "mongoose";

const challengeSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  points: { 
    type: Number, 
    required: true, 
    min: 0.1
  },
  participantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Participant",
    required: true
  }],
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Group",
    required: true,
    index: true
  },
}, { 
  timestamps: true 
});

// Compound index for efficient group + title searches
challengeSchema.index({ groupId: 1, title: "text" });

export default mongoose.model("Challenge", challengeSchema);

