import React, { Suspense, useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Carousel, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

// Import placeholder image
import heroPlaceholder from '../../assets/hero-background-optimized.jpg';


function HomePage() {
  const { currentUser } = useAuth();
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [featuredTournaments, setFeaturedTournaments] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [error, setError] = useState('');
  
  // Preload the hero background image and fetch featured tournaments
  useEffect(() => {
    // Preload hero image
    const img = new Image();
    img.src = require('../../assets/hero-background-optimized.jpg');
    img.onload = () => {
      // Once the image is loaded, update the CSS variable
      document.documentElement.style.setProperty(
        '--hero-background', 
        `url(${img.src})`
      );
      setHeroLoaded(true);
    };
    
    // Fetch featured tournaments
    fetchFeaturedTournaments();
  }, []);
  
  async function fetchFeaturedTournaments() {
    try {
      setLoadingFeatured(true);
      setError('');
      
      // Get featured tournaments from adminSettings collection
      const featuredDoc = doc(db, 'adminSettings', 'featuredTournaments');
      const featuredSnapshot = await getDoc(featuredDoc);
      
      if (featuredSnapshot.exists()) {
        const featuredData = featuredSnapshot.data();
        // Sort by displayOrder
        const sortedFeatured = featuredData.tournaments.sort((a, b) => a.displayOrder - b.displayOrder);
        setFeaturedTournaments(sortedFeatured);
      } else {
        setFeaturedTournaments([]);
      }
    } catch (error) {
      console.error('Error fetching featured tournaments:', error);
      setError('Failed to load featured tournaments');
    } finally {
      setLoadingFeatured(false);
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="bg-dark text-white py-5">
        <Container>
          <Row className="align-items-center">
            <Col xs={12} md={6} className="mb-4 mb-md-0">
              <h1 className="display-4 fw-bold">PUBG Tournaments</h1>
              <p className="lead">
                Join exciting tournaments for PUBG, 8 Ball Pool, and other multiplayer games.
                Compete with players worldwide and win amazing prizes!
              </p>
              <div className="d-flex flex-wrap gap-2 gap-md-3 mt-4">
                <Link to="/tournaments" className="mb-2 mb-md-0">
                  <Button variant="primary" size="lg" className="w-100">Browse Tournaments</Button>
                </Link>
                {!currentUser && (
                  <Link to="/signup" className="mb-2 mb-md-0">
                    <Button variant="outline-light" size="lg" className="w-100">Sign Up</Button>
                  </Link>
                )}
              </div>
            </Col>
            <Col md={6}>
              <div className="hero-image-container">
                {/* Placeholder with lazy-loaded image */}
                <img 
                  src={heroPlaceholder}
                  data-src={require('../../assets/hero-background-optimized.jpg')}
                  alt="PUBG Tournament" 
                  className={`img-fluid rounded shadow ${heroLoaded ? 'fade-in' : ''}`}
                  loading="eager"
                  width="600"
                  height="400"
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Featured Tournaments */}
      <Container className="py-5">
        <h2 className="text-center mb-4">Featured Tournaments</h2>
        {error && <Alert variant="danger" className="text-center">{error}</Alert>}
        
        {loadingFeatured ? (
          <div className="text-center p-4">Loading tournaments...</div>
        ) : featuredTournaments.length === 0 ? (
          <div className="text-center p-4">
            <p>No featured tournaments available at the moment.</p>
            <Link to="/tournaments">
              <Button variant="primary">Browse All Tournaments</Button>
            </Link>
          </div>
        ) : (
          <Suspense fallback={<div className="text-center p-4">Loading tournaments...</div>}>
            <Carousel className="mb-5 tournament-carousel" interval={5000}>
              {featuredTournaments.map((tournament) => (
                <Carousel.Item key={tournament.id}>
                  <div className="d-flex justify-content-center">
                    <div className="carousel-card-container" style={{ maxWidth: '800px' }}>
                      <Card className="text-center">
                        <Card.Header as="h5">{tournament.gameName}</Card.Header>
                        <Card.Body>
                          <Card.Title>Rs. {tournament.prizePool} Prize Pool</Card.Title>
                          <Card.Text>
                            {tournament.gameType} tournament with exciting prizes!
                          </Card.Text>
                          <Link to={`/tournaments/${tournament.id}`}>
                            <Button variant="primary">View Details</Button>
                          </Link>
                        </Card.Body>
                        <Card.Footer 
                          className={`${tournament.status === 'live' ? 'bg-success text-white' : 
                                      tournament.status === 'completed' ? 'bg-secondary text-white' : 
                                      'text-muted'}`}
                        >
                          {tournament.status === 'upcoming' ? 'Registration open' : 
                           tournament.status === 'live' ? 'LIVE NOW' : 
                           'Tournament ended'}
                        </Card.Footer>
                      </Card>
                    </div>
                  </div>
                </Carousel.Item>
              ))}
            </Carousel>
          </Suspense>
        )}

        {/* How It Works */}
        <h2 className="text-center mb-4">How It Works</h2>
        <Row className="mb-5">
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">1</h3>
                </div>
                <Card.Title>Sign Up</Card.Title>
                <Card.Text>
                  Create an account to get started. It&apos;s free and only takes a minute.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">2</h3>
                </div>
                <Card.Title>Join Tournaments</Card.Title>
                <Card.Text>
                  Browse available tournaments and join the ones you&apos;re interested in by paying the entry fee.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4} className="mb-4">
            <Card className="h-100 text-center">
              <Card.Body>
                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                  <h3 className="mb-0">3</h3>
                </div>
                <Card.Title>Compete & Win</Card.Title>
                <Card.Text>
                  Participate in the tournament at the scheduled time and compete for the prize pool.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Call to Action */}
        <div className="text-center py-4">
          <h3 className="mb-3">Ready to join the competition?</h3>
          <Link to="/tournaments">
            <Button variant="primary" size="lg">Browse All Tournaments</Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}

export default HomePage;