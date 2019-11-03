import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import { useAuth0 } from 'auth'
import UserPreferences from 'components/views/public/UserPreferences';
import { Home } from 'components/views/Home';
import { Login } from 'components/views/Login';

const AuthenticatedRoute = ({ component: Component, ...rest }) => {
  const { isAuthenticated } = useAuth0()
  return (
    <Route
      {...rest}
      render={props => isAuthenticated ? <Component {...props} /> : <Redirect to="/login" />}
    />
  )
}

export default () => {
  //const { loading } = useAuth0()
  //if (loading) {
  //  return <div>Loading...</div>
  //}

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <AuthenticatedRoute path='/admin' component={Home} />
      <Route exact path='/' component={UserPreferences} />
    </Switch>
  )
}
