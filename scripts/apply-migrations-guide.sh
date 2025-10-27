#!/bin/bash

# Supabase Migration Application Guide for Akora
# This script guides you through applying all 3 migrations

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

clear

echo -e "${BOLD}${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         Akora - Apply Supabase Migrations                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}📋 You have 3 migrations to apply:${NC}"
echo -e "   ${BLUE}1.${NC} Posts System (profiles, posts, likes, comments)"
echo -e "   ${BLUE}2.${NC} Chat System (chats, messages, real-time)"
echo -e "   ${BLUE}3.${NC} Marketplace (reviews, bookmarks, ratings)"
echo ""

echo -e "${BOLD}${GREEN}STEP 1: Open Supabase Dashboard${NC}"
echo -e "${CYAN}Press ENTER to open SQL Editor in your browser...${NC}"
read

# Open Supabase SQL Editor
if command -v open &> /dev/null; then
    open "https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql/new"
elif command -v xdg-open &> /dev/null; then
    xdg-open "https://supabase.com/dashboard/project/eclpduejlabiazblkvgh/sql/new"
fi

echo ""
echo -e "${BOLD}${GREEN}STEP 2: Apply Migration 1 - Posts System${NC}"
echo -e "${CYAN}File: ${BOLD}supabase/migrations/20251227000001_complete_posts_setup.sql${NC}"
echo -e "${YELLOW}Instructions:${NC}"
echo "  1. Open the file above in your editor"
echo "  2. Copy ALL content (Cmd+A, Cmd+C)"
echo "  3. Paste into Supabase SQL Editor"
echo "  4. Click 'Run' button"
echo "  5. Wait for success message"
echo ""
echo -e "${CYAN}Press ENTER when done...${NC}"
read

echo ""
echo -e "${BOLD}${GREEN}STEP 3: Apply Migration 2 - Chat System${NC}"
echo -e "${CYAN}File: ${BOLD}supabase/migrations/20251227000002_create_chat_system.sql${NC}"
echo -e "${YELLOW}Instructions:${NC}"
echo "  1. Clear the SQL Editor"
echo "  2. Open the file above"
echo "  3. Copy ALL content"
echo "  4. Paste into SQL Editor"
echo "  5. Click 'Run'"
echo ""
echo -e "${CYAN}Press ENTER when done...${NC}"
read

echo ""
echo -e "${BOLD}${GREEN}STEP 4: Apply Migration 3 - Marketplace${NC}"
echo -e "${CYAN}File: ${BOLD}supabase/migrations/20251227000003_marketplace_enhancements.sql${NC}"
echo -e "${YELLOW}Instructions:${NC}"
echo "  1. Clear the SQL Editor"
echo "  2. Open the file above"
echo "  3. Copy ALL content"
echo "  4. Paste into SQL Editor"
echo "  5. Click 'Run'"
echo ""
echo -e "${CYAN}Press ENTER when done...${NC}"
read

echo ""
echo -e "${BOLD}${GREEN}STEP 5: Verify Everything${NC}"
echo -e "${YELLOW}Go to: Database → Tables${NC}"
echo ""
echo -e "${BLUE}You should see these tables:${NC}"
echo "  ✓ profiles (3 sample users)"
echo "  ✓ posts, post_likes, post_comments, post_bookmarks, post_shares"
echo "  ✓ chats, chat_participants, messages (3 chats with messages)"
echo "  ✓ products_services, service_reviews, service_bookmarks"
echo ""
echo -e "${CYAN}Press ENTER when verified...${NC}"
read

echo ""
echo -e "${BOLD}${GREEN}✅ All Done!${NC}"
echo ""
echo -e "${CYAN}🎉 Your Akora app is now ready with:${NC}"
echo "   • Full posts/feed system"
echo "   • Real-time chat messaging"  
echo "   • Marketplace with reviews"
echo ""
echo -e "${YELLOW}Next: Test your app to see everything working!${NC}"
echo ""
