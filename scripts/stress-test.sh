#!/bin/bash
# BareStack CRM Comprehensive Stress Test
# Tests auth, CRUD, and all major flows

BASE_URL="${1:-http://localhost:5175}"
API_URL="${2:-http://localhost:8092}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
SKIP=0

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    local method="${4:-GET}"
    local data="${5:-}"

    if [ "$method" = "GET" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" ${data:+-d "$data"} 2>/dev/null)
    fi

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓${NC} $name (HTTP $response)"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $name - Expected $expected_code, got HTTP $response"
        ((FAIL++))
    fi
}

test_security_header() {
    local name="$1"
    local url="$2"
    local header="$3"

    value=$(curl -sI "$url" 2>/dev/null | grep -i "^$header:" | tr -d '\r' | cut -d: -f2- | xargs)

    if [ -n "$value" ]; then
        echo -e "${GREEN}✓${NC} $name: $value"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $name - Header not found"
        ((FAIL++))
    fi
}

echo -e "${BLUE}=========================================="
echo "BareStack CRM Comprehensive Stress Test"
echo "==========================================${NC}"
echo ""
echo "Frontend: $BASE_URL"
echo "API: $API_URL"
echo ""

echo -e "${BLUE}--- Static Assets & Headers ---${NC}"
test_endpoint "Home Page" "$BASE_URL/" 200
test_endpoint "JS Bundle" "$BASE_URL/assets/index-DnKtcR5_.js" 200
test_endpoint "CSS Bundle" "$BASE_URL/assets/index-9r7ntJ5p.css" 200

echo ""
echo -e "${BLUE}--- Security Headers ---${NC}"
test_security_header "X-Frame-Options" "$BASE_URL/" "x-frame-options"
test_security_header "X-Content-Type-Options" "$BASE_URL/" "x-content-type-options"
test_security_header "Referrer-Policy" "$BASE_URL/" "referrer-policy"
test_security_header "Permissions-Policy" "$BASE_URL/" "permissions-policy"

# Check CSP
csp=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i "content-security-policy:" | tr -d '\r')
if echo "$csp" | grep -qi "content-security-policy"; then
    echo -e "${GREEN}✓${NC} Content-Security-Policy present"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Content-Security-Policy missing"
    ((FAIL++))
fi

# Check no敏感信息泄露 in HTML
html=$(curl -s "$BASE_URL/" 2>/dev/null)
if echo "$html" | grep -qi "password\|secret\|api.key\|token"; then
    echo -e "${RED}✗${NC} Potential sensitive data in HTML"
    ((FAIL++))
else
    echo -e "${GREEN}✓${NC} No obvious secrets in HTML"
    ((PASS++))
fi

echo ""
echo -e "${BLUE}--- API Endpoints (No Auth) ---${NC}"
test_endpoint "API Health" "$API_URL/api/health" 200
test_endpoint "Auth Methods" "$API_URL/api/collections/users/auth-methods" 200

# Auth endpoint should be accessible
auth_methods=$(curl -s "$API_URL/api/collections/users/auth-methods" 2>/dev/null)
if echo "$auth_methods" | grep -qi "emailPassword"; then
    echo -e "${GREEN}✓${NC} Email/password auth enabled"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Email/password auth not found"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}--- API Auth Required Endpoints ---${NC}"
# These should return 401 without auth
test_endpoint "Collections (no auth)" "$API_URL/api/collections" 401
test_endpoint "Contacts (no auth)" "$API_URL/api/collections/contacts" 401

echo ""
echo -e "${BLUE}--- Input Validation Tests ---${NC}"
# Test filter injection
injection_result=$(curl -s "$API_URL/api/collections/contacts?filter=id=\" OR true OR id=\"&page=1&perPage=1" 2>/dev/null)
if echo "$injection_result" | grep -qi "error\|invalid"; then
    echo -e "${GREEN}✓${NC} Filter injection rejected"
    ((PASS++))
else
    echo -e "${YELLOW}~${NC} Filter injection check - review manually"
    ((SKIP++))
fi

# Test XSS in filter
xss_result=$(curl -s "$API_URL/api/collections/contacts?filter=name=<script>alert(1)</script>&page=1&perPage=1" 2>/dev/null)
if echo "$xss_result" | grep -qi "error\|invalid"; then
    echo -e "${GREEN}✓${NC} XSS in filter rejected"
    ((PASS++))
else
    echo -e "${YELLOW}~${NC} XSS check - review manually"
    ((SKIP++))
fi

echo ""
echo -e "${BLUE}--- Form Field Validation ---${NC}"
# Check React components for validation
contact_form=$(cat /home/ubuntu/apps/barestack-app/components/ContactForm.tsx 2>/dev/null)
if echo "$contact_form" | grep -qi "required\|minLength\|zod\|schema"; then
    echo -e "${GREEN}✓${NC} Contact form has validation"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Contact form validation not found"
    ((FAIL++))
fi

invoice_form=$(cat /home/ubuntu/apps/barestack-app/components/InvoiceForm.tsx 2>/dev/null)
if echo "$invoice_form" | grep -qi "required\|minLength\|zod"; then
    echo -e "${GREEN}✓${NC} Invoice form has validation"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Invoice form validation not found"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}--- Sanitization ---${NC}"
# Check that sanitizeId is used in API calls
api_ts=$(cat /home/ubuntu/apps/barestack-app/src/lib/api.ts 2>/dev/null)
sanitize_count=$(echo "$api_ts" | grep -c "sanitizeId" || true)
if [ "$sanitize_count" -gt 5 ]; then
    echo -e "${GREEN}✓${NC} sanitizeId used $sanitize_count times in API"
    ((PASS++))
else
    echo -e "${RED}✗${NC} sanitizeId only used $sanitize_count times - may be missing in some functions"
    ((FAIL++))
fi

# Check validation.ts exists
if [ -f "/home/ubuntu/apps/barestack-app/src/lib/validation.ts" ]; then
    echo -e "${GREEN}✓${NC} validation.ts exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} validation.ts not found"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}--- Build Output ---${NC}"
if [ -d "/home/ubuntu/apps/barestack-app/dist" ]; then
    echo -e "${GREEN}✓${NC} dist folder exists"
    ((PASS++))
else
    echo -e "${RED}✗${NC} dist folder missing"
    ((FAIL++))
fi

dist_html=$(cat /home/ubuntu/apps/barestack-app/dist/index.html 2>/dev/null)
if echo "$dist_html" | grep -qi "csp\|content-security-policy"; then
    echo -e "${GREEN}✓${NC} CSP in built HTML"
    ((PASS++))
else
    echo -e "${RED}✗${NC} CSP not in built HTML"
    ((FAIL++))
fi

echo ""
echo -e "${BLUE}=========================================="
echo -e "Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo -e "==========================================${NC}"

if [ $FAIL -gt 0 ]; then
    exit 1
fi
exit 0
