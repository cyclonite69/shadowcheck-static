-- ============================================================================
-- Standardize Radio Manufacturers and Addresses
-- ============================================================================
-- This migration applies professional title casing and acronym preservation
-- to the app.radio_manufacturers table. It handles known business suffixes
-- (LLC, Inc., Corp.) and common acronyms (IBM, NEC, TRW, etc.) properly.
-- ============================================================================

BEGIN;

-- Create a robust title casing function with acronym support
CREATE OR REPLACE FUNCTION app.professional_title_case(input_text TEXT) 
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    IF input_text IS NULL OR input_text = '' THEN
        RETURN input_text;
    END IF;

    -- Initial Title Case conversion
    -- Handles basic capitalization
    result := INITCAP(input_text);

    -- Standard Business Suffixes
    result := REGEXP_REPLACE(result, '\yLlc\y', 'LLC', 'gi');
    result := REGEXP_REPLACE(result, '\yInc\y', 'Inc.', 'gi');
    result := REGEXP_REPLACE(result, '\yCorp\y', 'Corp.', 'gi');
    result := REGEXP_REPLACE(result, '\yLtd\y', 'Ltd.', 'gi');
    result := REGEXP_REPLACE(result, '\yCo\y', 'Co.', 'gi');
    
    -- Countries and Regions
    result := REGEXP_REPLACE(result, '\yUsa\y', 'USA', 'gi');
    result := REGEXP_REPLACE(result, '\yUk\y', 'UK', 'gi');
    result := REGEXP_REPLACE(result, '\yGb\y', 'GB', 'gi');
    result := REGEXP_REPLACE(result, '\yJp\y', 'JP', 'gi');
    result := REGEXP_REPLACE(result, '\yFr\y', 'FR', 'gi');
    result := REGEXP_REPLACE(result, '\yDe\y', 'DE', 'gi');
    result := REGEXP_REPLACE(result, '\ySe\y', 'SE', 'gi');
    result := REGEXP_REPLACE(result, '\yKr\y', 'KR', 'gi');
    result := REGEXP_REPLACE(result, '\yTw\y', 'TW', 'gi');
    result := REGEXP_REPLACE(result, '\yCn\y', 'CN', 'gi');
    result := REGEXP_REPLACE(result, '\yAu\y', 'AU', 'gi');

    -- US States (Common in addresses)
    result := REGEXP_REPLACE(result, '\yNy\y', 'NY', 'gi');
    result := REGEXP_REPLACE(result, '\yCa\y', 'CA', 'gi');
    result := REGEXP_REPLACE(result, '\yTx\y', 'TX', 'gi');
    result := REGEXP_REPLACE(result, '\yMa\y', 'MA', 'gi');
    result := REGEXP_REPLACE(result, '\yMi\y', 'MI', 'gi');
    result := REGEXP_REPLACE(result, '\yOh\y', 'OH', 'gi');
    result := REGEXP_REPLACE(result, '\yPa\y', 'PA', 'gi');
    result := REGEXP_REPLACE(result, '\yFl\y', 'FL', 'gi');
    result := REGEXP_REPLACE(result, '\yGa\y', 'GA', 'gi');
    result := REGEXP_REPLACE(result, '\yNj\y', 'NJ', 'gi');
    result := REGEXP_REPLACE(result, '\yVa\y', 'VA', 'gi');
    result := REGEXP_REPLACE(result, '\yWa\y', 'WA', 'gi');

    -- Corporate Acronyms
    result := REGEXP_REPLACE(result, '\yIbm\y', 'IBM', 'gi');
    result := REGEXP_REPLACE(result, '\yNec\y', 'NEC', 'gi');
    result := REGEXP_REPLACE(result, '\yTrw\y', 'TRW', 'gi');
    result := REGEXP_REPLACE(result, '\yGmbh\y', 'GmbH', 'gi');
    result := REGEXP_REPLACE(result, '\yAg\y', 'AG', 'gi');
    result := REGEXP_REPLACE(result, '\yAb\y', 'AB', 'gi');
    result := REGEXP_REPLACE(result, '\ySa\y', 'SA', 'gi');
    result := REGEXP_REPLACE(result, '\ySrl\y', 'SRL', 'gi');
    result := REGEXP_REPLACE(result, '\yBv\y', 'BV', 'gi');
    result := REGEXP_REPLACE(result, '\yPlc\y', 'PLC', 'gi');

    -- Cleanup double dots and whitespace
    result := REPLACE(result, '..', '.');
    result := REPLACE(result, 'Inc..', 'Inc.');
    result := REPLACE(result, 'Corp..', 'Corp.');
    result := REGEXP_REPLACE(result, '\s+', ' ', 'g');
    result := TRIM(result);

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Apply standardization to existing records
UPDATE app.radio_manufacturers
SET 
    manufacturer = app.professional_title_case(manufacturer),
    address = app.professional_title_case(address)
WHERE manufacturer IS NOT NULL;

-- Cleanup the temporary function
DROP FUNCTION app.professional_title_case(TEXT);

COMMIT;
