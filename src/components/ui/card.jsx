import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const Card = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("rounded-xl border bg-card text-card-foreground shadow", className)}
      {...rest}
    />
  )
})
Card.displayName = "Card"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const CardHeader = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...rest}
    />
  )
})
CardHeader.displayName = "CardHeader"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const CardTitle = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...rest}
    />
  )
})
CardTitle.displayName = "CardTitle"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const CardDescription = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...rest}
    />
  )
})
CardDescription.displayName = "CardDescription"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const CardContent = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...rest} />
  )
})
CardContent.displayName = "CardContent"

/**
 * @type {React.ForwardRefExoticComponent<React.PropsWithChildren<any> & React.RefAttributes<HTMLDivElement>>}
 */
const CardFooter = React.forwardRef((props, ref) => {
  const { className, ...rest } = props
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...rest}
    />
  )
})
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
