CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action VARCHAR,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id);
END;
$$ LANGUAGE plpgsql;