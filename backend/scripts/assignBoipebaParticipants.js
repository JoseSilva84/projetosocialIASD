import "../src/config/database.js";
import Group from "../src/models/group.model.js";
import Participant from "../src/models/participant.model.js";

async function main() {
  const group = await Group.findOne({ name: "Boipeba" });
  if (!group) {
    console.error("Grupo Boipeba não encontrado.");
    process.exit(1);
  }

  const result = await Participant.updateMany(
    { $or: [{ groupId: null }, { groupId: { $exists: false } }] },
    { $set: { groupId: group._id } }
  );

  console.log(`Update concluído: correspondentes=${result.matchedCount}, modificados=${result.modifiedCount}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});