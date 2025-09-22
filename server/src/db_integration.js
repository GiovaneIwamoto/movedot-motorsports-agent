const { db } = require('../config/db_config');

async function getCards(req, res) {
  try {
    const result = await db.query("SELECT id, name, description, photo, data_type, data_file, data_url FROM cards ORDER BY created_at DESC");

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


async function deleteCard(req, res) {
  const id = req.body.id; 
  if (!id) {
    return res.status(400).json({ error: "ID do card é obrigatório" });
  }

  try {
    const result = await db.query("DELETE FROM cards WHERE id = $1 RETURNING *", [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    res.status(200).json({ success: true, message: "Card deletado com sucesso", deletedCard: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar card:", err);
    res.status(500).json({ error: "Erro ao deletar card" });
  }
}

async function updateCard(req, res) {
  const { id, name, description, data_type, data_file, data_url } = req.body;

  if (!id) {
    return res.status(400).json({ error: "ID do card é obrigatório" });
  }

  if (!name || !data_type || (data_type === "file" && !data_file) || (data_type === "url" && !data_url)) {
    return res.status(400).json({ error: "Dados inválidos para atualização" });
  }

  try {
    const query = `
      UPDATE cards
      SET name = $1,
          description = $2,
          data_type = $3,
          data_file = $4,
          data_url = $5
      WHERE id = $6
      RETURNING *
    `;

    const values = [
      name,
      description || null,
      data_type,
      data_type === "file" ? data_file : null,
      data_type === "url" ? data_url : null,
      id,
    ];

    const result = await db.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Card não encontrado" });
    }

    res.status(200).json({ success: true, updatedCard: result.rows[0] });
  } catch (err) {
    console.error("Erro ao atualizar card:", err);
    res.status(500).json({ error: "Erro ao atualizar card" });
  }
}




async function createCard(req, res) {
  const { name, description, data_type, data_url } = req.body;
  const data_file = null; // não vamos enviar arquivo por enquanto
  const photo = null;     // foto também null

  // Validação mínima
  if (!name || !data_type || (data_type === 'url' && !data_url)) {
    return res.status(400).json({ error: 'Dados inválidos para criação' });
  }

  try {
    const query = `
      INSERT INTO cards (name, description, data_type, data_file, data_url, photo)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      name,
      description || null,
      data_type,
      null,                // data_file
      data_type === 'url' ? data_url : null,
      null,                // photo
    ];

    const result = await db.query(query, values);

    res.status(201).json({ success: true, createdCard: result.rows[0] });
  } catch (err) {
    console.error('Erro ao criar card:', err);
    res.status(500).json({ error: 'Erro ao criar card' });
  }
}






module.exports = { getCards, deleteCard, updateCard, createCard };
