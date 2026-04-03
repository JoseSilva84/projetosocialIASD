import "../src/config/database.js";
import Group from "../src/models/group.model.js";
import Participant from "../src/models/participant.model.js";

async function main() {
  const targetGroupName = process.env.ASSIGN_GROUP_NAME || process.env.DEFAULT_GROUP_NAME;
  if (!targetGroupName) {
    console.error("É necessário informar ASSIGN_GROUP_NAME ou DEFAULT_GROUP_NAME no ambiente para atribuir participantes.");
    process.exit(1);
  }

  const group = await Group.findOne({ name: targetGroupName.trim() });
  if (!group) {
    console.error(`Grupo ${targetGroupName} não encontrado.`);
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