const { db } = require('../config/db_config');

async function getCards(req, res) {
  try {
    const result = await db.query("SELECT name, description, photo, data_type, data_file, data_url FROM cards ORDER BY created_at DESC");

    const cards = result.rows.map(card => ({
      ...card,
      photo: card.photo
        ? `data:image/jpeg;base64,${card.photo.toString("base64")}`
        : null
    }));

    res.json(cards);
  } catch (err) {
    console.error("Erro ao buscar cards:", err);
    res.status(500).json({ error: "Erro ao buscar cards" });
  }
}





module.exports = { getCards };
