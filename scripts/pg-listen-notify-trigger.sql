-- Trigger para notificar o y-websocket server quando uma nota é atualizada
-- externamente (ex: MCP, REST API). O y-ws escuta via LISTEN e aplica
-- as mudanças no Y.Doc em tempo real.
--
-- Executar no banco 'escreveaqui':
--   kubectl exec -n escreveaqui deploy/escreveaqui-db -- \
--     psql -U escreveaqui -d escreveaqui -f /dev/stdin < scripts/pg-listen-notify-trigger.sql

CREATE OR REPLACE FUNCTION notify_note_updated()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('nota_updated', NEW.slug);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nota_updated ON notes;
CREATE TRIGGER trg_nota_updated
  AFTER UPDATE OF content ON notes
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE FUNCTION notify_note_updated();
