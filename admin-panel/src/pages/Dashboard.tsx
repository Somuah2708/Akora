import { 
  Box, 
  Heading, 
  SimpleGrid, 
  Stat, 
  StatLabel, 
  StatNumber, 
  StatHelpText, 
  StatArrow,
  Card,
  CardHeader,
  CardBody,
  Text
} from '@chakra-ui/react';

export default function Dashboard() {
  return (
    <Box>
      <Heading mb={6}>Dashboard</Heading>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Total Users</StatLabel>
              <StatNumber>1,024</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                23.36%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Active Chats</StatLabel>
              <StatNumber>345</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                14.5%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>Messages Today</StatLabel>
              <StatNumber>2,845</StatNumber>
              <StatHelpText>
                <StatArrow type="decrease" />
                9.05%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>New Sign-ups</StatLabel>
              <StatNumber>48</StatNumber>
              <StatHelpText>
                <StatArrow type="increase" />
                28.3%
              </StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>
      
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card>
          <CardHeader>
            <Heading size="md">Recent Activity</Heading>
          </CardHeader>
          <CardBody>
            <Text>Activity data will be displayed here</Text>
          </CardBody>
        </Card>
        
        <Card>
          <CardHeader>
            <Heading size="md">System Status</Heading>
          </CardHeader>
          <CardBody>
            <Text>System status information will be displayed here</Text>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
}